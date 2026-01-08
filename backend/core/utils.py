import logging
import time
import requests
import os
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
    
    # URL del servizio di integrazione (Internal Docker Network)
    # Default to http://whatsapp-integration:3000 if not set
    integration_base_url = os.environ.get('WHATSAPP_INTEGRATION_URL', 'http://whatsapp-integration:3000')
    
    # Costruzione URL RESTful: /:session/:phone/check
    integration_url = f"{integration_base_url}/{session}/{phone_number}/check"
    
    logger.info(f"🔍 VERIFYING CONTACT {phone_number} on session {session} via {integration_url}...")
    
    try:
        response = requests.get(integration_url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            status_str = data.get('status')
            
            # Map response status to Enum
            if status_str == 'ok':
                status = Invitation.ContactVerified.OK
            elif status_str == 'not_present':
                status = Invitation.ContactVerified.NOT_PRESENT
            elif status_str == 'not_exist':
                status = Invitation.ContactVerified.NOT_EXIST
            else:
                status = Invitation.ContactVerified.NOT_VALID
                logger.warning(f"Unknown verification status received: {status_str}")
                
        else:
            logger.error(f"Integration service error: {response.status_code} - {response.text}")
            status = Invitation.ContactVerified.NOT_VALID
             
    except Exception as e:
        logger.error(f"Error calling verification service: {e}")
        status = Invitation.ContactVerified.NOT_VALID

    # Aggiorna stato (senza triggerare nuovi segnali ricorsivi se possibile)
    invitation.contact_verified = status
    invitation.save()
    logger.info(f"✅ Contact verification result for {invitation.code}: {status}")
