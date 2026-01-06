from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.conf import settings
import requests
import os
import time
from core.models import WhatsAppSessionStatus, WhatsAppMessageQueue

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
            
            # Estrazione Info Profilo
            # WAHA a volte ritorna: { raw: { me: {...} } } o a volte { me: {...} } nei custom endpoint
            raw_data = data.get('raw', {})
            
            # Tentativo 1: raw.me (formato standard WAHA)
            me_data = raw_data.get('me')
            
            # Tentativo 2: data.me (se integration lo espone direttamente)
            if not me_data:
                me_data = data.get('me')
            
            # Tentativo 3: se c'è solo un ID in raw.wid
            if not me_data and 'wid' in raw_data:
                 me_data = {'id': raw_data['wid'], 'pushName': 'Unknown User'}

            if me_data:
                profile_info = me_data
                # Normalizzazione campi
                if 'user' not in profile_info and 'id' in profile_info:
                     # WAHA format id: "123456@c.us"
                     if isinstance(profile_info['id'], str):
                        profile_info['user'] = profile_info['id'].split('@')[0]
                     elif isinstance(profile_info['id'], dict) and 'user' in profile_info['id']:
                        profile_info['user'] = profile_info['id']['user']
                        
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
        # Aumentato timeout a 15s perché WAHA può essere lento a stopparsi
        resp = requests.post(integration_url, timeout=15)
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
    """POST /api/admin/whatsapp/<groom|bride>/test/ - Invia messaggio a se stessi tramite CODA"""
    integration_base = get_integration_url()
    
    try:
        # 1. Recupera info 'me' per sapere il proprio numero
        status_resp = requests.get(f"{integration_base}/{session_type}/status", timeout=5)
        if status_resp.status_code != 200:
            return Response({'error': 'Impossibile recuperare stato sessione'}, status=500)
            
        status_data = status_resp.json()
        
        raw_data = status_data.get('raw', {})
        me = raw_data.get('me')
        if not me: me = status_data.get('me')

        if not me:
            return Response({'error': 'Info profilo non disponibili (sessione non pronta?)'}, status=400)

        # Estrazione numero normalizzata
        my_number = None
        if isinstance(me, dict):
             if 'user' in me: my_number = me['user']
             elif 'id' in me:
                 val = me['id']
                 if isinstance(val, str): my_number = val.split('@')[0]
                 elif isinstance(val, dict): my_number = val.get('user')

        if not my_number:
            return Response({'error': 'Numero di telefono non identificabile'}, status=400)

        # 2. Accoda messaggio a se stessi invece di invio diretto
        msg = WhatsAppMessageQueue.objects.create(
            session_type=session_type,
            recipient_number=my_number,
            message_body="🔔 *Test My-Wedding-App*\nIl sistema è connesso correttamente. Questo messaggio è stato processato dalla coda asincrona.",
            status=WhatsAppMessageQueue.Status.PENDING
        )
        
        return Response({
            'success': True, 
            'recipient': my_number, 
            'queued': True,
            'queue_id': msg.id,
            'message': 'Messaggio di test aggiunto alla coda di invio.'
        })
            
    except Exception as e:
        return Response({'error': str(e)}, status=503)
