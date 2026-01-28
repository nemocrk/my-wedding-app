import pytest
from unittest.mock import patch, MagicMock
from core.models import Invitation
from core.utils import verify_whatsapp_contact_task

@pytest.mark.django_db
class TestVerifyWhatsappContactTask:

    def test_invitation_not_found(self):
        # Should handle non-existent ID gracefully
        verify_whatsapp_contact_task(99999)

    def test_no_phone_number(self):
        inv = Invitation.objects.create(name="Test No Phone", code="NOPHONE")
        verify_whatsapp_contact_task(inv.id)
        inv.refresh_from_db()
        assert inv.contact_verified == Invitation.ContactVerified.NOT_VALID

    @patch('core.utils.requests.get')
    def test_verify_success_ok(self, mock_get):
        inv = Invitation.objects.create(name="Test OK", code="TESTOK", phone_number="1234567890", origin=Invitation.Origin.GROOM)
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'status': 'ok'}
        mock_get.return_value = mock_response

        verify_whatsapp_contact_task(inv.id)
        
        inv.refresh_from_db()
        assert inv.contact_verified == Invitation.ContactVerified.OK
        mock_get.assert_called_once()
        args, _ = mock_get.call_args
        assert "/groom/1234567890/check" in args[0]

    @patch('core.utils.requests.get')
    def test_verify_success_not_present(self, mock_get):
        inv = Invitation.objects.create(name="Test Not Present", code="TESTNP", phone_number="1234567890")
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'status': 'not_present'}
        mock_get.return_value = mock_response

        verify_whatsapp_contact_task(inv.id)
        
        inv.refresh_from_db()
        assert inv.contact_verified == Invitation.ContactVerified.NOT_PRESENT

    @patch('core.utils.requests.get')
    def test_verify_success_not_exist(self, mock_get):
        inv = Invitation.objects.create(name="Test Not Exist", code="TESTNE", phone_number="1234567890")
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'status': 'not_exist'}
        mock_get.return_value = mock_response

        verify_whatsapp_contact_task(inv.id)
        
        inv.refresh_from_db()
        assert inv.contact_verified == Invitation.ContactVerified.NOT_EXIST

    @patch('core.utils.requests.get')
    def test_verify_unknown_status(self, mock_get):
        inv = Invitation.objects.create(name="Test Unknown", code="TESTUNK", phone_number="1234567890")
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'status': 'weird_status'}
        mock_get.return_value = mock_response

        verify_whatsapp_contact_task(inv.id)
        
        inv.refresh_from_db()
        assert inv.contact_verified == Invitation.ContactVerified.NOT_VALID

    @patch('core.utils.requests.get')
    def test_verify_service_error(self, mock_get):
        inv = Invitation.objects.create(name="Test Error", code="TESTERR", phone_number="1234567890")
        
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_get.return_value = mock_response

        verify_whatsapp_contact_task(inv.id)
        
        inv.refresh_from_db()
        assert inv.contact_verified == Invitation.ContactVerified.NOT_VALID

    @patch('core.utils.requests.get')
    def test_verify_exception(self, mock_get):
        inv = Invitation.objects.create(name="Test Exception", code="TESTEXC", phone_number="1234567890")
        
        mock_get.side_effect = Exception("Connection refused")

        verify_whatsapp_contact_task(inv.id)
        
        inv.refresh_from_db()
        assert inv.contact_verified == Invitation.ContactVerified.NOT_VALID
