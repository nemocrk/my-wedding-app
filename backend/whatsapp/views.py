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
            # Se siamo in waiting_qr e la chiamata status ritorna il QR (dipende dall'impl di integration), salviamolo
            if data.get('qr_code'):
                status_obj.last_qr_code = data.get('qr_code')
            
            status_obj.save()
    except Exception as e:
        print(f"Integration error: {e}")
        pass
        
    return Response({
        'session_type': session_type,
        'state': status_obj.state,
        'last_check': status_obj.last_check,
        'error_message': status_obj.error_message,
        'qr_code': status_obj.last_qr_code if status_obj.state == 'waiting_qr' else None
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
        # 1. Trigger del refresh/start sessione
        resp = requests.post(integration_url, timeout=10)
        data = resp.json()
        
        # 2. Ottimizzazione UX: Se lo stato è waiting_qr ma non abbiamo il QR nel body della risposta
        # (o se integration sta ancora avviando il browser), aspettiamo un attimo e riproviamo il fetch del QR
        if data.get('state') in ['connecting', 'waiting_qr'] and not data.get('qr_code'):
            time.sleep(2.0) # Attesa attiva per dare tempo a WAHA di generare il QR
            
            try:
                # Chiediamo esplicitamente il QR
                qr_resp = requests.get(f"{get_integration_url()}/{session_type}/qr", timeout=5)
                if qr_resp.status_code == 200:
                    qr_data = qr_resp.json()
                    if qr_data.get('qr_code'):
                        data['qr_code'] = qr_data['qr_code']
                        data['state'] = 'waiting_qr' # Forziamo stato visuale
            except Exception:
                pass # Se fallisce, amen, ci penserà il polling frontend

        # Aggiorna il DB
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
        
        # Reset DB status
        status_obj, _ = WhatsAppSessionStatus.objects.get_or_create(session_type=session_type)
        status_obj.state = 'disconnected'
        status_obj.last_qr_code = None
        status_obj.error_message = None
        status_obj.save()
        
        return Response(data, status=resp.status_code)
    except Exception as e:
        return Response({'error': str(e)}, status=503)
