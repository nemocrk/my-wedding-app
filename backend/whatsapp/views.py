from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.conf import settings
import requests
import os
from core.models import WhatsAppSessionStatus

# Helper per URL integration
def get_integration_url():
    return os.getenv('WHATSAPP_INTEGRATION_URL', 'http://whatsapp-integration:4000')

@api_view(['GET'])
@permission_classes([IsAdminUser])
def whatsapp_status(request, session_type):
    """GET /api/admin/whatsapp/<groom|bride>/status/"""
    # Prima cerca nel DB locale
    status_obj, created = WhatsAppSessionStatus.objects.get_or_create(session_type=session_type)
    
    # Poi prova a chiedere al layer integration lo stato real-time
    try:
        integration_url = f"{get_integration_url()}/{session_type}/status"
        resp = requests.get(integration_url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            # Aggiorna DB
            status_obj.state = data.get('state', 'error')
            status_obj.save()
    except Exception as e:
        # Se fallisce, tieni stato DB ma notifica errore
        pass
        
    return Response({
        'session_type': session_type,
        'state': status_obj.state,
        'last_check': status_obj.last_check,
        'error_message': status_obj.error_message
    })

@api_view(['GET'])
@permission_classes([IsAdminUser])
def whatsapp_qr_code(request, session_type):
    """GET /api/admin/whatsapp/<groom|bride>/qr/"""
    integration_url = f"{get_integration_url()}/{session_type}/qr"
    try:
        resp = requests.get(integration_url, timeout=10)
        return Response(resp.json(), status=resp.status_code)
    except Exception as e:
        return Response({'error': str(e)}, status=503)

@api_view(['POST'])
@permission_classes([IsAdminUser])
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
