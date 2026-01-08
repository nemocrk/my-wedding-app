from django.test import TestCase
from django.core.exceptions import ValidationError
from ..models import Invitation

class InvitationContactInfoTests(TestCase):
    def test_default_origin(self):
        """Test that default origin is set to GROOM"""
        invitation = Invitation.objects.create(
            name="Test Family",
            code="test-family"
        )
        self.assertEqual(invitation.origin, Invitation.Origin.GROOM)

    def test_set_origin_bride(self):
        """Test setting origin to BRIDE"""
        invitation = Invitation.objects.create(
            name="Bride Family",
            code="bride-family",
            origin=Invitation.Origin.BRIDE
        )
        self.assertEqual(invitation.origin, Invitation.Origin.BRIDE)
    
    def test_invalid_origin_fails_validation(self):
        """Test that invalid origin raises ValidationError (if full_clean called)"""
        invitation = Invitation(
            name="Invalid Origin",
            code="invalid-origin",
            origin='invalid_value'
        )
        # Note: save() doesn't call full_clean() automatically in Django models
        with self.assertRaises(ValidationError):
            invitation.full_clean()

    def test_phone_number_storage(self):
        """Test storing phone number"""
        phone = "+393331234567"
        invitation = Invitation.objects.create(
            name="Phone Family",
            code="phone-family",
            phone_number=phone
        )
        invitation.refresh_from_db()
        self.assertEqual(invitation.phone_number, phone)

    def test_phone_number_optional(self):
        """Test phone number is optional"""
        invitation = Invitation.objects.create(
            name="No Phone",
            code="no-phone"
        )
        self.assertIsNone(invitation.phone_number)
        
    def test_status_workflow(self):
        """Test basic status workflow transitions"""
        inv = Invitation.objects.create(name="Status Test", code="status-test")
        self.assertEqual(inv.status, Invitation.Status.CREATED)
        
        inv.status = Invitation.Status.SENT
        inv.save()
        self.assertEqual(inv.status, 'sent')
        
        inv.status = Invitation.Status.READ
        inv.save()
        self.assertEqual(inv.status, 'read')
