from django.core.management.base import BaseCommand
from core.models import WhatsAppMessageQueue, GlobalConfig
from django.utils import timezone
from datetime import timedelta
import requests
import time
import os

class Command(BaseCommand):
    help = 'Processes the WhatsApp message queue with rate limiting'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting WhatsApp Worker...'))
        
        while True:
            try:
                self.process_queue()
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Worker Error: {str(e)}'))
            
            # Sleep 60s or config interval
            time.sleep(int(os.getenv('WAHA_WORKER_INTERVAL', 60)))

    def process_queue(self):
        config = GlobalConfig.objects.first()
        if not config:
            return

        limit_per_hour = config.whatsapp_rate_limit
        integration_url = os.getenv('WHATSAPP_INTEGRATION_URL', 'http://whatsapp-integration:4000')

        # Check pending messages
        now = timezone.now()
        pending_msgs = WhatsAppMessageQueue.objects.filter(
            status=WhatsAppMessageQueue.Status.PENDING,
            scheduled_for__lte=now
        ).order_by('scheduled_for')

        if not pending_msgs.exists():
            return

        for msg in pending_msgs:
            # CHECK RATE LIMIT
            one_hour_ago = now - timedelta(hours=1)
            sent_count = WhatsAppMessageQueue.objects.filter(
                session_type=msg.session_type,
                status=WhatsAppMessageQueue.Status.SENT,
                sent_at__gte=one_hour_ago
            ).count()

            if sent_count >= limit_per_hour:
                self.stdout.write(f"Rate limit reached for {msg.session_type} ({sent_count}/{limit_per_hour}). Skipping.")
                continue

            # SEND MESSAGE
            try:
                msg.status = WhatsAppMessageQueue.Status.PROCESSING
                msg.save()

                payload = {
                    'phone': msg.recipient_number,
                    'message': msg.message_body
                }
                
                url = f"{integration_url}/{msg.session_type}/send"
                resp = requests.post(url, json=payload, timeout=30)
                
                if resp.status_code == 200:
                    msg.status = WhatsAppMessageQueue.Status.SENT
                    msg.sent_at = timezone.now()
                    msg.save()
                    self.stdout.write(self.style.SUCCESS(f"Sent to {msg.recipient_number}"))
                else:
                    msg.status = WhatsAppMessageQueue.Status.FAILED
                    msg.error_log = f"Status: {resp.status_code}, Body: {resp.text}"
                    msg.save()
                    self.stdout.write(self.style.ERROR(f"Failed sending to {msg.recipient_number}"))

            except Exception as e:
                msg.status = WhatsAppMessageQueue.Status.FAILED
                msg.error_log = str(e)
                msg.save()
                self.stdout.write(self.style.ERROR(f"Exception sending to {msg.recipient_number}: {e}"))
