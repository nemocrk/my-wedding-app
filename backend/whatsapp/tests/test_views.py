import pytest
from unittest.mock import patch, MagicMock
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from core.models import WhatsAppSessionStatus, WhatsAppMessageQueue

@pytest.mark.django_db
class TestWhatsAppViews:
    def setup_method(self):
        self.client = APIClient()

    # --- WhatsAppMessageQueueViewSet Tests ---

    def test_retry_failed_messages(self):
        # Create failed messages
        WhatsAppMessageQueue.objects.create(
            session_type='groom', recipient_number='123', message_body='test',
            status=WhatsAppMessageQueue.Status.FAILED, attempts=3
        )
        WhatsAppMessageQueue.objects.create(
            session_type='bride', recipient_number='456', message_body='test2',
            status=WhatsAppMessageQueue.Status.FAILED, attempts=3
        )
        # Create pending message (should not be touched)
        WhatsAppMessageQueue.objects.create(
            session_type='groom', recipient_number='789', message_body='test3',
            status=WhatsAppMessageQueue.Status.PENDING
        )

        url = '/api/admin/whatsapp-queue/retry-failed/'
        response = self.client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['retried_count'] == 2
        
        # Verify status reset
        assert WhatsAppMessageQueue.objects.filter(status=WhatsAppMessageQueue.Status.PENDING).count() == 3

    def test_force_send_message(self):
        msg = WhatsAppMessageQueue.objects.create(
            session_type='groom', recipient_number='123', message_body='test',
            status=WhatsAppMessageQueue.Status.FAILED, attempts=3, 
            scheduled_for=timezone.now() + timezone.timedelta(hours=1)
        )
        
        url = f'/api/admin/whatsapp-queue/{msg.id}/force-send/'
        response = self.client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        msg.refresh_from_db()
        assert msg.status == WhatsAppMessageQueue.Status.PENDING
        assert msg.attempts == 0
        # Check scheduled_for is near now
        assert abs((msg.scheduled_for - timezone.now()).total_seconds()) < 5

    # --- Functional Views Tests (Integration Mocked) ---

    @patch('whatsapp.views.requests.get')
    def test_whatsapp_status_success(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'state': 'connected',
            'qr_code': None,
            'me': {'user': '1234567890', 'name': 'Test User', 'picture': 'url_to_pic'}
        }
        mock_get.return_value = mock_response

        url = '/api/admin/whatsapp/groom/status/'
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['state'] == 'connected'
        assert response.data['profile']['user'] == '1234567890'
        
        # Verify DB update
        status_obj = WhatsAppSessionStatus.objects.get(session_type='groom')
        assert status_obj.state == 'connected'
        assert status_obj.phone_number == '1234567890'

    @patch('whatsapp.views.requests.get')
    def test_whatsapp_status_error(self, mock_get):
        mock_get.side_effect = Exception("Connection Error")

        url = '/api/admin/whatsapp/bride/status/'
        response = self.client.get(url)
        
        # Should return 200 with error info from DB/default even if integration fails
        assert response.status_code == status.HTTP_200_OK
        assert response.data['session_type'] == 'bride'
        
    @patch('whatsapp.views.requests.get')
    def test_whatsapp_qr_code_success(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'qr_code': 'some_base64_qr'}
        mock_get.return_value = mock_response

        url = '/api/admin/whatsapp/groom/qr/'
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['qr_code'] == 'some_base64_qr'

    @patch('whatsapp.views.requests.get')
    def test_whatsapp_qr_code_failure(self, mock_get):
        mock_get.side_effect = Exception("Service Down")
        url = '/api/admin/whatsapp/groom/qr/'
        response = self.client.get(url)
        assert response.status_code == 503

    @patch('whatsapp.views.requests.post')
    @patch('whatsapp.views.requests.get')
    def test_whatsapp_refresh_status(self, mock_get, mock_post):
        # Initial refresh call
        mock_post_resp = MagicMock()
        mock_post_resp.status_code = 200
        mock_post_resp.json.return_value = {'state': 'waiting_qr', 'qr_code': None}
        mock_post.return_value = mock_post_resp
        
        # Follow-up QR check
        mock_get_resp = MagicMock()
        mock_get_resp.status_code = 200
        mock_get_resp.json.return_value = {'qr_code': 'new_qr'}
        mock_get.return_value = mock_get_resp

        with patch('time.sleep', return_value=None): # Skip sleep
            url = '/api/admin/whatsapp/groom/refresh/'
            response = self.client.post(url)

        assert response.status_code == status.HTTP_200_OK
        # Should have updated state based on logic
        status_obj = WhatsAppSessionStatus.objects.get(session_type='groom')
        assert status_obj.state == 'waiting_qr'
        assert status_obj.last_qr_code == 'new_qr'

    @patch('whatsapp.views.requests.post')
    def test_whatsapp_logout(self, mock_post):
        mock_post_resp = MagicMock()
        mock_post_resp.status_code = 200
        mock_post_resp.json.return_value = {'success': True}
        mock_post.return_value = mock_post_resp
        
        # Pre-set logged in state
        WhatsAppSessionStatus.objects.create(session_type='groom', state='connected', phone_number='123')

        url = '/api/admin/whatsapp/groom/logout/'
        response = self.client.post(url)

        assert response.status_code == status.HTTP_200_OK
        
        status_obj = WhatsAppSessionStatus.objects.get(session_type='groom')
        assert status_obj.state == 'disconnected'
        assert status_obj.phone_number is None

    @patch('whatsapp.views.requests.get')
    def test_whatsapp_send_test_success(self, mock_get):
        # Mock status to get "me" info
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'me': {'user': '1234567890'}
        }
        mock_get.return_value = mock_response

        url = '/api/admin/whatsapp/groom/test/'
        response = self.client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['queued'] is True
        
        # Check queue
        msg = WhatsAppMessageQueue.objects.last()
        assert msg.recipient_number == '1234567890'
        assert "Test My-Wedding-App" in msg.message_body

    @patch('whatsapp.views.requests.get')
    def test_whatsapp_send_test_no_profile(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'me': None} # No profile info
        mock_get.return_value = mock_response

        url = '/api/admin/whatsapp/groom/test/'
        response = self.client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
