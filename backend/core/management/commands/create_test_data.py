from django.core.management.base import BaseCommand
from core.models import Invitation, GlobalConfig, WhatsAppSessionStatus
import sys

class Command(BaseCommand):
    help = 'Creates test data for load testing and returns credentials'

    def handle(self, *args, **options):
        # 1. Ensure Global Config exists
        config, _ = GlobalConfig.objects.get_or_create(pk=1)
        
        # 2. Create or Get Test Invitation
        # Using a code that is unlikely to collide with real data
        code = "test-load-user"
        WhatsAppSessionStatus.objects.get_or_create(session_type='groom')
        invitation, created = Invitation.objects.get_or_create(
            code=code,
            defaults={
                "name": "Test Load User",
                "status": Invitation.Status.CREATED,
                "origin": 'groom'
            }
        )
        
        # 3. Generate Valid Token
        # The model method generates token based on ID + Secret
        token = invitation.generate_verification_token(config.invitation_link_secret)
        
        # 4. Output in format suitable for .env sourcing or parsing
        # We print to stdout. The caller should capture this.
        self.stdout.write(f"TEST_CODE={code}")
        self.stdout.write(f"TEST_TOKEN={token}")
