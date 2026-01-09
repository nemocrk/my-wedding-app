import pytest
from core.models import Invitation, GuestInteraction

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

    def test_auto_mark_as_read_on_first_visit(self, api_client, invitation_factory, global_config):
        """
        Test that invitation status changes from 'sent' to 'read' 
        automatically when the first 'visit' analytics event arrives.
        """
        # 1. Create invitation with status 'sent'
        inv = invitation_factory("visit-test", "Visit Test", [])
        inv.status = Invitation.Status.SENT
        inv.save()
        
        # 2. Auth
        token = inv.generate_verification_token(global_config.invitation_link_secret)
        api_client.post('/api/public/auth/', {'code': inv.code, 'token': token})
        
        # 3. Log first visit event
        response = api_client.post('/api/public/log-interaction/', {
            'event_type': 'visit',
            'metadata': {'session_id': 'test-session-1'}
        }, format='json')
        
        assert response.status_code == 200
        assert response.data['logged'] is True
        
        # 4. Verify status changed to 'read'
        inv.refresh_from_db()
        assert inv.status == Invitation.Status.READ
        
        # 5. Verify interaction was logged
        interaction = GuestInteraction.objects.filter(
            invitation=inv,
            event_type='visit'
        ).first()
        assert interaction is not None

    def test_mark_as_read_idempotency(self, api_client, invitation_factory, global_config):
        """
        Test that multiple visit events don't cause issues (idempotency).
        Status should remain 'read' after first transition.
        """
        inv = invitation_factory("idempotent-test", "Idempotent Test", [])
        inv.status = Invitation.Status.SENT
        inv.save()
        
        token = inv.generate_verification_token(global_config.invitation_link_secret)
        api_client.post('/api/public/auth/', {'code': inv.code, 'token': token})
        
        # First visit
        api_client.post('/api/public/log-interaction/', {
            'event_type': 'visit',
            'metadata': {'session_id': 'session-1'}
        }, format='json')
        
        inv.refresh_from_db()
        assert inv.status == Invitation.Status.READ
        
        # Second visit (should not cause errors)
        api_client.post('/api/public/log-interaction/', {
            'event_type': 'visit',
            'metadata': {'session_id': 'session-2'}
        }, format='json')
        
        inv.refresh_from_db()
        assert inv.status == Invitation.Status.READ  # Still read, no re-transition
        
        # Verify both interactions logged
        visit_count = GuestInteraction.objects.filter(
            invitation=inv,
            event_type='visit'
        ).count()
        assert visit_count == 2

    def test_non_visit_events_dont_trigger_mark_as_read(self, api_client, invitation_factory, global_config):
        """
        Test that other event types (click_cta, etc.) don't trigger the sent->read transition.
        """
        inv = invitation_factory("non-visit-test", "Non-Visit Test", [])
        inv.status = Invitation.Status.SENT
        inv.save()
        
        token = inv.generate_verification_token(global_config.invitation_link_secret)
        api_client.post('/api/public/auth/', {'code': inv.code, 'token': token})
        
        # Log a click event (not a visit)
        api_client.post('/api/public/log-interaction/', {
            'event_type': 'click_cta',
            'metadata': {'button_id': 'rsvp-button'}
        }, format='json')
        
        inv.refresh_from_db()
        # Status should still be 'sent' (not changed)
        assert inv.status == Invitation.Status.SENT

    def test_mark_as_read_already_confirmed(self, api_client, invitation_factory, global_config):
        """
        Test that auto mark_as_read doesn't affect invitations in other states (e.g., confirmed).
        """
        inv = invitation_factory("confirmed-test", "Confirmed Test", [])
        inv.status = Invitation.Status.CONFIRMED
        inv.save()
        
        token = inv.generate_verification_token(global_config.invitation_link_secret)
        api_client.post('/api/public/auth/', {'code': inv.code, 'token': token})
        
        # Log visit
        api_client.post('/api/public/log-interaction/', {
            'event_type': 'visit',
            'metadata': {'session_id': 'test-session'}
        }, format='json')
        
        inv.refresh_from_db()
        # Status should remain 'confirmed'
        assert inv.status == Invitation.Status.CONFIRMED


@pytest.mark.django_db
class TestMarkAsReadEndpoint:
    """
    Test suite for the manual /api/admin/invitations/<id>/mark-as-read/ endpoint.
    """
    
    def test_manual_mark_as_read_success(self, admin_api_client, invitation_factory):
        """
        Test manual transition sent -> read via admin endpoint.
        """
        inv = invitation_factory("manual-read-test", "Manual Read Test", [])
        inv.status = Invitation.Status.SENT
        inv.save()
        
        response = admin_api_client.post(f'/api/admin/invitations/{inv.id}/mark-as-read/')
        
        assert response.status_code == 200
        assert response.data['status'] == 'read'
        assert response.data['transition'] == 'sent -> read'
        
        inv.refresh_from_db()
        assert inv.status == Invitation.Status.READ
    
    def test_manual_mark_as_read_idempotent(self, admin_api_client, invitation_factory):
        """
        Test that calling mark-as-read on already 'read' invitation is safe (idempotent).
        """
        inv = invitation_factory("idempotent-read-test", "Idempotent Read Test", [])
        inv.status = Invitation.Status.READ
        inv.save()
        
        response = admin_api_client.post(f'/api/admin/invitations/{inv.id}/mark-as-read/')
        
        assert response.status_code == 200
        assert response.data['transition'] == 'none'
        assert 'già in stato' in response.data['message']
        
        inv.refresh_from_db()
        assert inv.status == Invitation.Status.READ
    
    def test_manual_mark_as_read_wrong_state(self, admin_api_client, invitation_factory):
        """
        Test that mark-as-read doesn't change status if invitation is in 'confirmed' state.
        """
        inv = invitation_factory("wrong-state-test", "Wrong State Test", [])
        inv.status = Invitation.Status.CONFIRMED
        inv.save()
        
        response = admin_api_client.post(f'/api/admin/invitations/{inv.id}/mark-as-read/')
        
        assert response.status_code == 200
        assert response.data['status'] == 'confirmed'
        assert response.data['transition'] == 'none'
        
        inv.refresh_from_db()
        assert inv.status == Invitation.Status.CONFIRMED  # Unchanged
