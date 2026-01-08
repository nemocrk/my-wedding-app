import logging
import time
import requests
from django.conf import settings
from .models import Invitation, GlobalConfig

logger = logging.getLogger(__name__)

def verify_whatsapp_contact_task(invitation_id):
    """
    Esegue la verifica sincrona del contatto WhatsApp chiamando il servizio esterno (WAHA/Integration Layer).
    Aggiorna lo stato `contact_verified` dell'invito.
    """
    try:
        invitation = Invitation.objects.get(pk=invitation_id)
    except Invitation.DoesNotExist:
        logger.error(f"Invitation {invitation_id} not found for verification")
        return

    phone_number = invitation.phone_number
    if not phone_number:
        invitation.contact_verified = Invitation.ContactVerified.NOT_VALID
        invitation.save()
        return

    # Determina sessione (groom/bride)
    session = 'groom' if invitation.origin == Invitation.Origin.GROOM else 'bride'
    
    # URL del servizio di integrazione (assumiamo sia un endpoint interno o proxato)
    # TODO: Spostare URL in settings
    # integration_url = f"http://whatsapp-service:3000/api/contacts?contactId={phone_number}&session={session}"
    
    # MOCK TEMPORANEO PER PROTOTIPO (Sostituire con chiamata reale)
    # Simula logica di verifica
    logger.info(f"VERIFYING CONTACT {phone_number} on session {session}...")
    
    try:
        # Esempio chiamata reale (commentata fino a disponibilità servizio)
        # response = requests.get(integration_url, timeout=5)
        # data = response.json()
        # if response.status_code == 200 and data.get('exists'):
        #    status = Invitation.ContactVerified.OK
        # else:
        #    status = Invitation.ContactVerified.NOT_EXIST
        
        # Logica Mock (per testare UI)
        if "00000" in phone_number:
             status = Invitation.ContactVerified.NOT_EXIST
        elif "12345" in phone_number:
             status = Invitation.ContactVerified.NOT_PRESENT
        else:
             status = Invitation.ContactVerified.OK
             
    except Exception as e:
        logger.error(f"Error verifying contact: {e}")
        status = Invitation.ContactVerified.NOT_VALID

    # Aggiorna stato (senza triggerare nuovi segnali ricorsivi se possibile)
    # Usiamo update() per evitare post_save signal loop, ma update non aggiorna l'istanza in memoria
    # Quindi usiamo save() ma il signal deve essere smart (fatto nel passo precedente)
    invitation.contact_verified = status
    invitation.save()
    logger.info(f"Contact verification result for {invitation.code}: {status}")
