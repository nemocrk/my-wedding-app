from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.conf import settings
import requests
import os
import time
from core.models import WhatsAppSessionStatus

# Helper per URL integration
def get_integration_url():
    # In docker-compose internal network
    return os.getenv('WA_INTEGRATION_URL', 'http://whatsapp-integration:3000')

@api_view(['GET'])
@authentication_classes([]) # Nessuna autenticazione richiesta
@permission_classes([AllowAny]) # Accesso pubblico (intranet protetta da firewall/nginx)
def whatsapp_status(request, session_type):
    """GET /api/admin/whatsapp/<groom|bride>/status/"""
    status_obj, created = WhatsAppSessionStatus.objects.get_or_create(session_type=session_type)
    
    profile_info = None

    try:
        integration_url = f"{get_integration_url()}/{session_type}/status"
        resp = requests.get(integration_url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            status_obj.state = data.get('state', 'error')
            if data.get('qr_code'):
                status_obj.last_qr_code = data.get('qr_code')
            status_obj.save()
            
            # Estrazione Info Profilo dal campo 'raw' (che contiene la risposta WAHA)
            # WAHA ritorna: { ..., "me": { "id": "...", "pushName": "..." } }
            if 'raw' in data and 'me' in data['raw']:
                profile_info = data['raw']['me']

    except Exception as e:
        print(f"Integration error: {e}")
        pass
        
    return Response({
        'session_type': session_type,
        'state': status_obj.state,
        'last_check': status_obj.last_check,
        'error_message': status_obj.error_message,
        'qr_code': status_obj.last_qr_code if status_obj.state == 'waiting_qr' else None,
        'profile': profile_info
    })

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def whatsapp_qr_code(request, session_type):
    """GET /api/admin/whatsapp/<groom|bride>/qr/"""
    integration_url = f"{get_integration_url()}/{session_type}/qr"
    try:
        resp = requests.get(integration_url, timeout=10)
        return Response(resp.json(), status=resp.status_code)
    except Exception as e:
        return Response({'error': str(e)}, status=503)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def whatsapp_refresh_status(request, session_type):
    """POST /api/admin/whatsapp/<groom|bride>/refresh/"""
    integration_url = f"{get_integration_url()}/{session_type}/refresh"
    try:
        resp = requests.post(integration_url, timeout=10)
        data = resp.json()
        
        if data.get('state') in ['connecting', 'waiting_qr'] and not data.get('qr_code'):
            time.sleep(2.0)
            try:
                qr_resp = requests.get(f"{get_integration_url()}/{session_type}/qr", timeout=5)
                if qr_resp.status_code == 200:
                    qr_data = qr_resp.json()
                    if qr_data.get('qr_code'):
                        data['qr_code'] = qr_data['qr_code']
                        data['state'] = 'waiting_qr'
            except Exception:
                pass

        status_obj, _ = WhatsAppSessionStatus.objects.get_or_create(session_type=session_type)
        status_obj.state = data.get('state', 'error')
        status_obj.last_qr_code = data.get('qr_code')
        status_obj.error_message = data.get('error')
        status_obj.save()
        
        return Response(data, status=resp.status_code)
    except Exception as e:
        return Response({'error': str(e)}, status=503)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def whatsapp_logout(request, session_type):
    """POST /api/admin/whatsapp/<groom|bride>/logout/"""
    integration_url = f"{get_integration_url()}/{session_type}/logout"
    try:
        resp = requests.post(integration_url, timeout=10)
        data = resp.json()
        
        status_obj, _ = WhatsAppSessionStatus.objects.get_or_create(session_type=session_type)
        status_obj.state = 'disconnected'
        status_obj.last_qr_code = None
        status_obj.error_message = None
        status_obj.save()
        
        return Response(data, status=resp.status_code)
    except Exception as e:
        return Response({'error': str(e)}, status=503)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def whatsapp_send_test(request, session_type):
    """POST /api/admin/whatsapp/<groom|bride>/test/ - Invia messaggio a se stessi"""
    integration_base = get_integration_url()
    
    try:
        # 1. Recupera info 'me' per sapere il proprio numero
        status_resp = requests.get(f"{integration_base}/{session_type}/status", timeout=5)
        if status_resp.status_code != 200:
            return Response({'error': 'Impossibile recuperare stato sessione'}, status=500)
            
        status_data = status_resp.json()
        me = status_data.get('raw', {}).get('me')
        
        if not me or not me.get('user'): # 'user' è il numero senza @c.us in WAHA/WebJS
             # Fallback: prova a parsare _serialized o id
             my_number = me.get('id', '').split('@')[0] if me else None
        else:
             my_number = me.get('user')

        if not my_number:
            return Response({'error': 'Impossibile identificare il numero mittente (sessione non pronta o info mancanti)'}, status=400)

        # 2. Invia messaggio a se stessi
        send_url = f"{integration_base}/{session_type}/send"
        payload = {
            "phone": my_number,
            "message": "🔔 *Test My-Wedding-App*\nIl sistema è connesso correttamente e può inviare messaggi."
        }
        
        send_resp = requests.post(send_url, json=payload, timeout=10)
        
        if send_resp.status_code == 200:
            return Response({'success': True, 'recipient': my_number})
        else:
            return Response(send_resp.json(), status=send_resp.status_code)
            
    except Exception as e:
        return Response({'error': str(e)}, status=503)
