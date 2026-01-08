import logging
import os
import requests
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Invitation, WhatsAppTemplate, WhatsAppMessageQueue, GlobalConfig, Person

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
    
    # Caso 1: Creazione con telefono
    if created and instance.phone_number:
        should_verify = True
        
    # Caso 2: Modifica telefono
    elif not created and hasattr(instance, '_previous_phone'):
        if instance.phone_number != instance._previous_phone and instance.phone_number:
            should_verify = True
            
    # Caso 3: Stato esplicitamente non valido (es. reset da UI)
    if instance.contact_verified == Invitation.ContactVerified.NOT_VALID and instance.phone_number:
        should_verify = True

    if should_verify:
        logger.info(f"🔍 Triggering contact verification for {instance.name} ({instance.phone_number})")
        # Chiamata asincrona al microservizio di verifica (via Celery o chiamata diretta non bloccante)
        # Per ora simuliamo/implementiamo la chiamata diretta ma idealmente andrebbe in background task
        try:
            from .utils import verify_whatsapp_contact_task
            verify_whatsapp_contact_task(instance.id)
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
        if not instance.phone_number:
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
            recipient_number=instance.phone_number,
            message_body=message_body,
            status=WhatsAppMessageQueue.Status.PENDING,
            scheduled_for=timezone.now() # Invia il prima possibile
        )
        
        logger.info(f"✅ Enqueued automated message for {instance.name} (Template: {template.name}) -> ID: {queue_item.id}")
