from django.core.management.base import BaseCommand
from core.models import WhatsAppMessageQueue, WhatsAppMessageEvent, GlobalConfig
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
            # Log QUEUED event
            WhatsAppMessageEvent.objects.create(
                queue_message=msg,
                phase=WhatsAppMessageEvent.Phase.QUEUED,
                metadata={'worker': 'django', 'session': msg.session_type}
            )

            # CHECK RATE LIMIT
            one_hour_ago = now - timedelta(hours=1)
            sent_count = WhatsAppMessageQueue.objects.filter(
                session_type=msg.session_type,
                status=WhatsAppMessageQueue.Status.SENT,
                sent_at__gte=one_hour_ago
            ).count()

            if sent_count >= limit_per_hour:
                # Log waiting for rate limit
                WhatsAppMessageEvent.objects.create(
                    queue_message=msg,
                    phase=WhatsAppMessageEvent.Phase.WAITING_RATE_LIMIT,
                    metadata={
                        'sent_count': sent_count,
                        'limit': limit_per_hour,
                        'reason': 'rate_limit_reached'
                    }
                )
                self.stdout.write(f"Rate limit reached for {msg.session_type} ({sent_count}/{limit_per_hour}). Skipping.")
                
                # Mark as skipped
                msg.status = WhatsAppMessageQueue.Status.SKIPPED
                msg.error_log = f"Rate limit reached ({sent_count}/{limit_per_hour}). Will retry later."
                msg.save()
                
                WhatsAppMessageEvent.objects.create(
                    queue_message=msg,
                    phase=WhatsAppMessageEvent.Phase.SKIPPED,
                    metadata={'reason': 'rate_limit'}
                )
                continue

            # Rate limit OK - proceed
            WhatsAppMessageEvent.objects.create(
                queue_message=msg,
                phase=WhatsAppMessageEvent.Phase.RATE_LIMIT_OK,
                metadata={
                    'sent_count': sent_count,
                    'limit': limit_per_hour,
                    'remaining': limit_per_hour - sent_count
                }
            )

            # SEND MESSAGE
            try:
                msg.status = WhatsAppMessageQueue.Status.PROCESSING
                msg.attempts += 1
                msg.save()

                payload = {
                    'phone': msg.recipient_number,
                    'message': msg.message_body,
                    'queue_id': msg.id  # Pass queue_id for event tracking
                }
                
                url = f"{integration_url}/{msg.session_type}/send"
                resp = requests.post(url, json=payload, timeout=60)  # Increased timeout for human-like delays
                
                if resp.status_code == 200:
                    msg.status = WhatsAppMessageQueue.Status.SENT
                    msg.sent_at = timezone.now()
                    msg.save()
                    self.stdout.write(self.style.SUCCESS(f"Sent to {msg.recipient_number}"))
                else:
                    msg.status = WhatsAppMessageQueue.Status.FAILED
                    msg.error_log = f"Status: {resp.status_code}, Body: {resp.text}"
                    msg.save()
                    
                    WhatsAppMessageEvent.objects.create(
                        queue_message=msg,
                        phase=WhatsAppMessageEvent.Phase.FAILED,
                        metadata={'status_code': resp.status_code, 'error': resp.text}
                    )
                    self.stdout.write(self.style.ERROR(f"Failed sending to {msg.recipient_number}"))

            except Exception as e:
                msg.status = WhatsAppMessageQueue.Status.FAILED
                msg.error_log = str(e)
                msg.save()
                
                WhatsAppMessageEvent.objects.create(
                    queue_message=msg,
                    phase=WhatsAppMessageEvent.Phase.FAILED,
                    metadata={'exception': str(e), 'type': type(e).__name__}
                )
                self.stdout.write(self.style.ERROR(f"Exception sending to {msg.recipient_number}: {e}"))
