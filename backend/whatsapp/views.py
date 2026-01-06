from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAdminUser, AllowAny, IsAuthenticated
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from rest_framework.response import Response
from django.conf import settings
import requests
import os
from core.models import WhatsAppSessionStatus

# Helper per URL integration
def get_integration_url():
    # In docker-compose internal network
    return os.getenv('WA_INTEGRATION_URL', 'http://whatsapp-integration:3000')

@api_view(['GET'])
# Usa SessionAuth esplicitamente per permettere l'uso dei cookie di sessione django (sessionid)
# L'errore "Non sono state immesse credenziali" spesso accade se DRF si aspetta Token/Basic ma riceve cookie
@authentication_classes([SessionAuthentication, BasicAuthentication])
@permission_classes([IsAuthenticated]) # Richiede login ma va bene sessione
def whatsapp_status(request, session_type):
    """GET /api/admin/whatsapp/<groom|bride>/status/"""
    # Prima cerca nel DB locale
    status_obj, created = WhatsAppSessionStatus.objects.get_or_create(session_type=session_type)
    
    # Poi prova a chiedere al layer integration lo stato real-time
    try:
        # Nota: La porta corretta per whatsapp-integration in rete docker è 3000 (o 4000 se cambiato)
        # Verificare server.js -> porta 3000
        integration_url = f"{get_integration_url()}/{session_type}/status"
        resp = requests.get(integration_url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            # Aggiorna DB
            status_obj.state = data.get('state', 'error')
            # Se lo stato è waiting_qr, potremmo avere dettagli extra ma qui salviamo solo stato
            status_obj.save()
    except Exception as e:
        # Se fallisce, logga ma non rompere tutto
        print(f"Integration error: {e}")
        pass
        
    return Response({
        'session_type': session_type,
        'state': status_obj.state,
        'last_check': status_obj.last_check,
        'error_message': status_obj.error_message
    })

@api_view(['GET'])
@authentication_classes([SessionAuthentication, BasicAuthentication])
@permission_classes([IsAuthenticated])
def whatsapp_qr_code(request, session_type):
    """GET /api/admin/whatsapp/<groom|bride>/qr/"""
    integration_url = f"{get_integration_url()}/{session_type}/qr"
    try:
        resp = requests.get(integration_url, timeout=10)
        return Response(resp.json(), status=resp.status_code)
    except Exception as e:
        return Response({'error': str(e)}, status=503)

@api_view(['POST'])
@authentication_classes([SessionAuthentication, BasicAuthentication])
@permission_classes([IsAuthenticated])
def whatsapp_refresh_status(request, session_type):
    """POST /api/admin/whatsapp/<groom|bride>/refresh/"""
    integration_url = f"{get_integration_url()}/{session_type}/refresh"
    try:
        resp = requests.post(integration_url, timeout=10)
        data = resp.json()
        
        # Aggiorna il DB
        status_obj, _ = WhatsAppSessionStatus.objects.get_or_create(session_type=session_type)
        status_obj.state = data.get('state', 'error')
        status_obj.last_qr_code = data.get('qr_code')
        status_obj.error_message = data.get('error')
        status_obj.save()
        
        return Response(data, status=resp.status_code)
    except Exception as e:
        return Response({'error': str(e)}, status=503)
