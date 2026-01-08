import pytest
from core.models import Invitation, Accommodation

@pytest.mark.django_db
class TestAdminAPI:
    def test_create_invitation(self, api_client):
        payload = {
            "code": "new-family",
            "name": "New Family",
            "status": "pending",
            "accommodation_offered": True,
            "guests": [
                {"first_name": "John", "last_name": "Doe", "is_child": False},
                {"first_name": "Jane", "is_child": True}
            ]
        }
        response = api_client.post('/api/admin/invitations/', payload, format='json')
        assert response.status_code == 201
        assert Invitation.objects.count() == 1
        inv = Invitation.objects.first()
        assert inv.guests.count() == 2
        assert inv.guests.filter(is_child=True).exists()

    def test_generate_link(self, api_client, invitation_factory, global_config):
        inv = invitation_factory("link-test", "Link Test", [])
        response = api_client.get(f'/api/admin/invitations/{inv.id}/generate_link/')
        
        assert response.status_code == 200
        assert 'token' in response.data
        assert 'url' in response.data
        assert inv.verify_token(response.data['token'], global_config.invitation_link_secret)

    def test_create_accommodation_with_rooms(self, api_client):
        payload = {
            "name": "Grand Hotel",
            "address": "Downtown",
            "rooms": [
                {"room_number": "101", "capacity_adults": 2, "capacity_children": 0},
                {"room_number": "102", "capacity_adults": 2, "capacity_children": 2}
            ]
        }
        response = api_client.post('/api/admin/accommodations/', payload, format='json')
        assert response.status_code == 201
        acc = Accommodation.objects.first()
        assert acc.rooms.count() == 2
        assert acc.rooms.filter(room_number="102").first().capacity_children == 2
