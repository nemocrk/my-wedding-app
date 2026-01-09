import pytest
from django.core.exceptions import ValidationError
from core.models import Invitation

@pytest.mark.django_db
class TestInvitationContactInfo:
    """Converted to pytest and expanded"""

    def test_default_origin(self):
        """Test that default origin is set to GROOM"""
        invitation = Invitation.objects.create(
            name="Test Family",
            code="test-family"
        )
        assert invitation.origin == Invitation.Origin.GROOM

    def test_set_origin_bride(self):
        """Test setting origin to BRIDE"""
        invitation = Invitation.objects.create(
            name="Bride Family",
            code="bride-family",
            origin=Invitation.Origin.BRIDE
        )
        assert invitation.origin == Invitation.Origin.BRIDE
    
    def test_invalid_origin_fails_validation(self):
        """Test that invalid origin raises ValidationError"""
        invitation = Invitation(
            name="Invalid Origin",
            code="invalid-origin",
            origin='invalid_value'
        )
        with pytest.raises(ValidationError):
            invitation.full_clean()

    def test_phone_number_storage(self):
        """Test storing legacy phone number"""
        phone = "+393331234567"
        invitation = Invitation.objects.create(
            name="Phone Family",
            code="phone-family",
            phone_number=phone
        )
        invitation.refresh_from_db()
        assert invitation.phone_number == phone

    def test_status_workflow(self):
        """Test basic status workflow transitions"""
        inv = Invitation.objects.create(name="Status Test", code="status-test")
        assert inv.status == Invitation.Status.CREATED
        
        inv.status = Invitation.Status.SENT
        inv.save()
        assert inv.status == 'sent'
        
        inv.status = Invitation.Status.READ
        inv.save()
        assert inv.status == 'read'

    # NEW TESTS
    def test_whatsapp_phone_storage(self, invitation_factory):
        """Test storing whatsapp specific number"""
        inv = invitation_factory("wa-test", "WA Test", [])
        inv.phone_number = "+393330000000"
        inv.save()
        
        inv.refresh_from_db()
        assert inv.phone_number == "+393330000000"

    def test_sms_phone_storage(self, invitation_factory):
        """Test storing sms specific number"""
        inv = invitation_factory("sms-test", "SMS Test", [])
        inv.phone_number = "+393331111111"
        inv.save()
        
        inv.refresh_from_db()
        assert inv.phone_number == "+393331111111"

    def test_contact_fields_are_optional(self, invitation_factory):
        """Verify new contact fields are not mandatory"""
        inv = invitation_factory("opt-test", "Optional Test", [])
        inv.full_clean() # Should pass without errors
        assert inv.phone_number is None
        assert inv.contact_verified is Invitation.ContactVerified.NOT_VALID
