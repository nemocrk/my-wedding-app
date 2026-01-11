from rest_framework.decorators import api_view, permission_classes, authentication_classes, action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import viewsets, status as drf_status
from django.conf import settings
from django.utils import timezone
import requests
import os
import time
from core.models import WhatsAppSessionStatus, WhatsAppMessageQueue, WhatsAppMessageEvent
from .serializers import WhatsAppMessageEventSerializer, WhatsAppMessageQueueSerializer

# Helper per URL integration
def get_integration_url():
    # In docker-compose internal network
    return os.getenv('WA_INTEGRATION_URL', 'http://whatsapp-integration:3000')

class WhatsAppMessageEventViewSet(viewsets.ModelViewSet):
    """
    ViewSet per creare eventi da servizio Node.js
    Endpoint: POST /api/admin/whatsapp-events/
    """
    queryset = WhatsAppMessageEvent.objects.all()
    serializer_class = WhatsAppMessageEventSerializer
    authentication_classes = []  # No auth - internal service call
    permission_classes = [AllowAny]
    http_method_names = ['post', 'get']  # Solo creazione e lettura

class WhatsAppMessageQueueViewSet(viewsets.ModelViewSet):
    """
    ViewSet per la coda messaggi (CRUD completo da frontend)
    Endpoint: GET /api/admin/whatsapp-queue/
    """
    queryset = WhatsAppMessageQueue.objects.all().select_related().prefetch_related('events').order_by('-scheduled_for')
    serializer_class = WhatsAppMessageQueueSerializer
    authentication_classes = []
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'], url_path='retry-failed')
    def retry_failed(self, request):
        count = WhatsAppMessageQueue.objects.filter(status=WhatsAppMessageQueue.Status.FAILED).update(
            status=WhatsAppMessageQueue.Status.PENDING,
            attempts=0,
            error_log=None
        )
        return Response({'success': True, 'retried_count': count})

    @action(detail=True, methods=['post'], url_path='force-send')
    def force_send(self, request, pk=None):
        msg = self.get_object()
        msg.status = WhatsAppMessageQueue.Status.PENDING
        msg.attempts = 0
        msg.scheduled_for = timezone.now()
        msg.save()
        return Response({'success': True, 'message': 'Message queued for immediate sending'})

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
            
            # Estrazione Info Profilo
            raw_data = data.get('raw', {})
            me_data = raw_data.get('me')
            
            if not me_data:
                me_data = data.get('me')
            
            if not me_data and 'wid' in raw_data:
                 me_data = {'id': raw_data['wid'], 'pushName': 'Unknown User'}

            if me_data:
                profile_info = me_data
                if 'user' not in profile_info and 'id' in profile_info:
                     if isinstance(profile_info['id'], str):
                        profile_info['user'] = profile_info['id'].split('@')[0]
                     elif isinstance(profile_info['id'], dict) and 'user' in profile_info['id']:
                        profile_info['user'] = profile_info['id']['user']
                status_obj.phone_number = profile_info.get('user', None)
                status_obj.name = profile_info.get('name', None)
                status_obj.picture = profile_info.get('picture', None)
                
            status_obj.save()
                        
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
        if data.get('state') != 'connected':
            status_obj.phone_number = None
            status_obj.name = None
            status_obj.picture = None
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
        resp = requests.post(integration_url, timeout=15)
        data = resp.json()
        
        status_obj, _ = WhatsAppSessionStatus.objects.get_or_create(session_type=session_type)
        status_obj.phone_number = None
        status_obj.name = None
        status_obj.picture = None
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
        status_resp = requests.get(f"{integration_base}/{session_type}/status", timeout=5)
        if status_resp.status_code != 200:
            return Response({'error': 'Impossibile recuperare stato sessione'}, status=500)
            
        status_data = status_resp.json()
        
        raw_data = status_data.get('raw', {})
        me = raw_data.get('me')
        if not me: me = status_data.get('me')

        if not me:
            return Response({'error': 'Info profilo non disponibili (sessione non pronta?)'}, status=400)

        my_number = None
        if isinstance(me, dict):
             if 'user' in me: my_number = me['user']
             elif 'id' in me:
                 val = me['id']
                 if isinstance(val, str): my_number = val.split('@')[0]
                 elif isinstance(val, dict): my_number = val.get('user')

        if not my_number:
            return Response({'error': 'Numero di telefono non identificabile'}, status=400)

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
