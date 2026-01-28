from django.test import TestCase, Client
from django.contrib.auth.models import User
from unittest.mock import patch, MagicMock
from core.models import WhatsAppSessionStatus, WhatsAppMessageQueue, GlobalConfig
from django.utils import timezone
from datetime import timedelta
from whatsapp.management.commands.run_whatsapp_worker import Command as WorkerCommand
import json

class WhatsAppAPITest(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin_user = User.objects.create_superuser('admin', 'admin@test.com', 'password')
        self.client.force_login(self.admin_user)
        self.config = GlobalConfig.objects.create(whatsapp_rate_limit=5)

    @patch('whatsapp.views.requests.get')
    def test_get_status_success(self, mock_get):
        # Mock external integration response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'state': 'connected'}
        mock_get.return_value = mock_response

        response = self.client.get('/api/admin/whatsapp/groom/status/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['state'], 'connected')
        
        # Verify DB updated
        status = WhatsAppSessionStatus.objects.get(session_type='groom')
        self.assertEqual(status.state, 'connected')

    @patch('whatsapp.views.requests.post')
    def test_refresh_status_trigger(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'state': 'waiting_qr', 
            'qr_code': 'data:image/png;base64,dummy'
        }
        mock_post.return_value = mock_response

        response = self.client.post('/api/admin/whatsapp/bride/refresh/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['state'], 'waiting_qr')
        
        status = WhatsAppSessionStatus.objects.get(session_type='bride')
        self.assertEqual(status.state, 'waiting_qr')
        self.assertEqual(status.last_qr_code, 'data:image/png;base64,dummy')


class WhatsAppWorkerTest(TestCase):
    def setUp(self):
        self.config = GlobalConfig.objects.create(whatsapp_rate_limit=2) # Low limit for testing
        self.cmd = WorkerCommand()
        self.cmd.stdout = MagicMock()
        self.cmd.style = MagicMock()

    @patch('whatsapp.management.commands.run_whatsapp_worker.requests.post')
    def test_process_queue_success(self, mock_post):
        # Create pending message
        msg = WhatsAppMessageQueue.objects.create(
            session_type='groom',
            recipient_number='123456789',
            message_body='Hello',
            status=WhatsAppMessageQueue.Status.PENDING
        )

        # Mock success response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        # Run worker logic once
        self.cmd.process_queue()

        msg.refresh_from_db()
        self.assertEqual(msg.status, WhatsAppMessageQueue.Status.SENT)
        self.assertIsNotNone(msg.sent_at)

    @patch('whatsapp.management.commands.run_whatsapp_worker.requests.post')
    def test_rate_limiting_logic(self, mock_post):
        # Create 2 SENT messages in the last hour
        now = timezone.now()
        WhatsAppMessageQueue.objects.create(session_type='groom', recipient_number='1', status='sent', sent_at=now)
        WhatsAppMessageQueue.objects.create(session_type='groom', recipient_number='2', status='sent', sent_at=now)
        
        # Create new pending message
        msg = WhatsAppMessageQueue.objects.create(
            session_type='groom', 
            recipient_number='3', 
            status='pending'
        )

        # Run worker
        self.cmd.process_queue()

        msg.refresh_from_db()
        # Should still be pending because rate limit is 2
        self.assertEqual(msg.status, WhatsAppMessageQueue.Status.SKIPPED)
        mock_post.assert_not_called()

    @patch('whatsapp.management.commands.run_whatsapp_worker.requests.post')
    def test_rate_limiting_expiry(self, mock_post):
        # Create 2 SENT messages OLDER than 1 hour
        old_time = timezone.now() - timedelta(hours=1, minutes=1)
        WhatsAppMessageQueue.objects.create(session_type='groom', recipient_number='1', status='sent', sent_at=old_time)
        WhatsAppMessageQueue.objects.create(session_type='groom', recipient_number='2', status='sent', sent_at=old_time)
        
        msg = WhatsAppMessageQueue.objects.create(
            session_type='groom', 
            recipient_number='3', 
            status='pending'
        )

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        # Run worker
        self.cmd.process_queue()

        msg.refresh_from_db()
        # Should be SENT now
        self.assertEqual(msg.status, WhatsAppMessageQueue.Status.SENT)
