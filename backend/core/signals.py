import logging
import os
import requests
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from .models import Invitation, InvitationLabel, WhatsAppTemplate, WhatsAppMessageQueue, GlobalConfig, Person, Room

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=Invitation)
def track_invitation_changes(sender, instance, **kwargs):
    """
    Traccia lo stato precedente dell'invito prima del salvataggio
    per rilevare cambiamenti di status o numero di telefono.
    """
    if instance.pk:
        try:
            original = Invitation.objects.get(pk=instance.pk)
            instance._previous_status = original.status
            instance._previous_phone = original.phone_number
        except Invitation.DoesNotExist:
            instance._previous_status = None
            instance._previous_phone = None
    else:
        instance._previous_status = None
        instance._previous_phone = None

@receiver(post_save, sender=Person)
def auto_assign_dietary_label(sender, instance, created, **kwargs):
    """
    Auto-assegna l'etichetta 'Intolleranze' all'invito quando un ospite 
    compila il campo dietary_requirements.
    """
    # Evita loop se update_fields contiene solo campi non rilevanti
    # Se update_fields è None, processa tutto. Se è una lista, controlla se c'è dietary_requirements.
    if kwargs.get('update_fields') is not None and 'dietary_requirements' not in kwargs['update_fields']:
        return
    
    invitation = instance.invitation
    
    # Se il campo dietary_requirements è valorizzato (non None e non stringa vuota)
    if instance.dietary_requirements and instance.dietary_requirements.strip():
        # Crea o recupera l'etichetta
        label, _ = InvitationLabel.objects.get_or_create(
            name="Intolleranze",
            defaults={'color': '#FF6B6B'}  # Rosso per visibilità
        )
        
        # Aggiungi all'invito se non c'è già
        if not invitation.labels.filter(pk=label.pk).exists():
            invitation.labels.add(label)
            logger.info(f"🍽️ Auto-assigned 'Intolleranze' label to {invitation.name}")
    
    # Logica di rimozione (se il campo è stato svuotato o se l'etichetta c'era già ma va verificata)
    else:
        # Controlla se altri ospiti dell'invito hanno intolleranze
        # Escludiamo l'istanza corrente nel controllo (anche se qui ha già il valore aggiornato, è più sicuro queryare il DB o la relazione)
        # Nota: post_save, quindi instance è già salvata col nuovo valore vuoto.
        
        has_dietary = invitation.guests.filter(
            dietary_requirements__isnull=False
        ).exclude(dietary_requirements='').exists()
        
        if not has_dietary:
            try:
                label = InvitationLabel.objects.get(name="Intolleranze")
                if invitation.labels.filter(pk=label.pk).exists():
                    invitation.labels.remove(label)
                    logger.info(f"❌ Removed 'Intolleranze' label from {invitation.name}")
            except InvitationLabel.DoesNotExist:
                pass

@receiver(post_save, sender=Invitation)
def trigger_whatsapp_on_status_change(sender, instance, created, **kwargs):
    """
    Gestisce due tipi di automazione:
    1. Invio messaggi automatici su cambio stato
    2. Verifica contatto WhatsApp su cambio numero o creazione
    """
    
    # --- 1. VERIFICA CONTATTO WHATSAPP ---
    # Trigger se:
    # - Creato nuovo invito con telefono
    # - Numero di telefono modificato
    # - Stato verification è 'not_valid' (forzato manualmente o da reset)
    
    should_verify = False
    
    # Avoid infinite loop: if update_fields was used and only contains 'contact_verified', skip
    if kwargs.get('update_fields') and 'contact_verified' in kwargs['update_fields'] and len(kwargs['update_fields']) == 1:
        should_verify = False
    else:
        # Caso 1: Creazione con telefono
        if created and instance.phone_number:
            should_verify = True
            
        # Caso 2: Modifica telefono
        elif not created and hasattr(instance, '_previous_phone'):
            if instance.phone_number != instance._previous_phone and instance.phone_number:
                should_verify = True
                
        # Caso 3: Stato esplicitamente non valido (es. reset da UI)
        # Nota: dobbiamo stare attenti a non triggerare loop se il task stesso imposta NOT_VALID su errore
        if instance.contact_verified == Invitation.ContactVerified.NOT_VALID and instance.phone_number and not getattr(instance, '_skip_signal', False):
             # Aggiungiamo un check per evitare di ritentare se è appena stato settato a NOT_VALID dal task
             # (concettualmente complesso senza async, per ora ci fidiamo del update_fields check sopra nel task)
             if not created and instance.phone_number == instance._previous_phone:
                 # Se il telefono non è cambiato e siamo qui, potrebbe essere un reset manuale
                 should_verify = True

    if should_verify:
        logger.info(f"🔍 Triggering contact verification for {instance.name} ({instance.phone_number})")
        # Chiamata asincrona al microservizio di verifica (via Celery o chiamata diretta non bloccante)
        try:
            from .utils import verify_whatsapp_contact_task
            # Passiamo l'id per evitare serializzazione oggetto
            # Eseguiamo solo se non siamo in test environment SENZA mocking, 
            # altrimenti blocca i test unitari cercando di connettersi a localhost:3000
            if not os.environ.get('DJANGO_TEST_MODE', 'False') == 'True':
                 verify_whatsapp_contact_task(instance.id)
            else:
                 logger.info("Skipping actual verification call in TEST MODE")
        except ImportError:
            logger.warning("Verification task not implemented yet")

    # --- 2. INVIO MESSAGGI AUTOMATICI (Status Change) ---
    
    if created or not hasattr(instance, '_previous_status'):
        return

    if instance.status == instance._previous_status:
        return

    new_status = instance.status
    logger.info(f"🔄 Status change detected for {instance.code}: {instance._previous_status} -> {new_status}")

    # Cerca template attivi per il nuovo stato
    templates = WhatsAppTemplate.objects.filter(
        condition=WhatsAppTemplate.Condition.STATUS_CHANGE,
        trigger_status=new_status,
        is_active=True
    )

    if not templates.exists():
        logger.debug(f"No active templates found for status {new_status}")
        return

    # Recupera Configurazione Globale (per link secret)
    try:
        config = GlobalConfig.objects.get(pk=1)
    except GlobalConfig.DoesNotExist:
        logger.warning("GlobalConfig not found, skipping automated message generation")
        return

    # Genera Link Pubblico
    token = instance.generate_verification_token(config.invitation_link_secret)
    frontend_url = os.environ.get('FRONTEND_PUBLIC_URL', 'http://localhost')
    public_link = f"{frontend_url}?code={instance.code}&token={token}"

    # Risolve Contatti (Sposo vs Sposa)
    if instance.origin == Invitation.Origin.GROOM:
        sender_session = 'groom'
    else:
        sender_session = 'bride'

    # Itera sui template (potrebbero essercene molteplici, anche se logicamente uno per status è meglio)
    for template in templates:
        if not instance.phone_number and not template.recipient == WhatsAppTemplate.Recipient.GUEST:
            logger.warning(f"Skipping automated message for {instance.name}: No phone number")
            continue

        # Formattazione Messaggio
        try:
            message_body = template.content.format(
                name=instance.name,
                code=instance.code,
                link=public_link,
                guest_names=", ".join([str(p) for p in instance.guests.all()])
            )
        except KeyError as e:
            logger.error(f"Template formatting error for {template.name}: missing key {e}")
            message_body = template.content # Fallback senza formattazione
        except Exception as e:
            logger.error(f"Unexpected formatting error: {e}")
            continue

        # Creazione Messaggio in Coda
        queue_item = WhatsAppMessageQueue.objects.create(
            session_type=sender_session,
            recipient_number=instance.phone_number if template.recipient == WhatsAppTemplate.Recipient.GUEST else 'spouse',
            message_body=message_body,
            status=WhatsAppMessageQueue.Status.PENDING,
            scheduled_for=timezone.now() # Invia il prima possibile
        )
        
        logger.info(f"✅ Enqueued automated message for {instance.name} (Template: {template.name}) -> ID: {queue_item.id}")


@receiver(post_delete, sender=Room)
def reset_accommodation_pin_on_room_delete(sender, instance, **kwargs):
    """
    Quando una Room viene cancellata, resetta accommodation_pinned a False
    per tutti i Person che erano assegnati a quella stanza.
    
    Django metterà automaticamente assigned_room a null (SET_NULL),
    ma dobbiamo anche resettare il flag di pin.
    """
    Person.objects.filter(
        assigned_room=instance
    ).update(accommodation_pinned=False)
    
    logger.info(f"🔓 Reset accommodation_pinned for guests in deleted room: {instance}")
