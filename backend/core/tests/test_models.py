from django.test import TestCase
from core.models import Invitation, Person

class InvitationModelTest(TestCase):
    def test_create_invitation(self):
        """Test basic invitation creation"""
        invitation = Invitation.objects.create(
            name="Famiglia Test",
            code="famiglia-test"
        )
        self.assertEqual(invitation.name, "Famiglia Test")
        self.assertEqual(invitation.code, "famiglia-test")
        self.assertFalse(invitation.accommodation_offered)
        
    def test_invitation_str(self):
        """Test string representation"""
        invitation = Invitation.objects.create(
            name="Famiglia Test",
            code="famiglia-test"
        )
        self.assertEqual(str(invitation), "Famiglia Test (famiglia-test)")

class PersonModelTest(TestCase):
    def setUp(self):
        self.invitation = Invitation.objects.create(
            name="Famiglia Test",
            code="famiglia-test"
        )
        
    def test_create_person(self):
        """Test person creation linked to invitation"""
        person = Person.objects.create(
            invitation=self.invitation,
            first_name="Mario",
            last_name="Rossi",
            is_child=False
        )
        self.assertEqual(person.first_name, "Mario")
        self.assertEqual(person.invitation, self.invitation)
