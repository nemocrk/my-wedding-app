import pytest
from core.models import Invitation

@pytest.mark.django_db
class TestPublicAPI:
    def test_auth_success(self, api_client, invitation_factory, global_config):
        inv = invitation_factory("pub-test", "Public Test", [])
        token = inv.generate_verification_token(global_config.invitation_link_secret)
        
        response = api_client.post('/api/public/auth/', {
            'code': inv.code,
            'token': token
        })
        
        assert response.status_code == 200
        assert response.data['valid'] is True
        # Check session
        assert api_client.session['invitation_id'] == inv.id

    def test_auth_failure(self, api_client, invitation_factory):
        inv = invitation_factory("fail-test", "Fail Test", [])
        response = api_client.post('/api/public/auth/', {
            'code': inv.code,
            'token': "bad-token"
        })
        assert response.status_code == 403

    def test_rsvp_flow(self, api_client, invitation_factory, global_config):
        # 1. Auth
        inv = invitation_factory("rsvp-test", "RSVP Test", [])
        token = inv.generate_verification_token(global_config.invitation_link_secret)
        api_client.post('/api/public/auth/', {'code': inv.code, 'token': token})
        
        # 2. RSVP
        payload = {
            "status": "confirmed",
            "accommodation_requested": True,
            "transfer_requested": False
        }
        response = api_client.post('/api/public/rsvp/', payload)
        
        assert response.status_code == 200
        inv.refresh_from_db()
        assert inv.status == "confirmed"
        assert inv.accommodation_requested is True
        assert inv.transfer_requested is False

    def test_protected_access_denied(self, api_client):
        """Try accessing RSVP without auth"""
        response = api_client.post('/api/public/rsvp/', {})
        assert response.status_code == 401
