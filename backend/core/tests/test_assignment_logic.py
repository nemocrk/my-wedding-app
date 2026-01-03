import pytest
from core.models import Invitation, Person

@pytest.mark.django_db
class TestAssignmentLogic:
    def test_basic_assignment(self, api_client, accommodation_with_rooms, invitation_factory):
        # 1 Invitation, 2 Adults -> Should fit in Room 101
        inv = invitation_factory("assign-1", "Assign 1", [
            {'first_name': 'A', 'is_child': False},
            {'first_name': 'B', 'is_child': False}
        ])
        inv.status = 'confirmed'
        inv.accommodation_requested = True
        inv.save()
        
        response = api_client.post('/api/admin/accommodations/auto-assign/', {'reset_previous': True})
        assert response.status_code == 200
        assert response.data['assigned_count'] == 2
        
        inv.refresh_from_db()
        assert inv.accommodation == accommodation_with_rooms
        assert inv.guests.first().assigned_room.room_number == "101"

    def test_capacity_overflow(self, api_client, accommodation_with_rooms, invitation_factory):
        # 3 Adults -> Should not fit in any room (max 2 adults per room)
        inv = invitation_factory("assign-fail", "Assign Fail", [
            {'first_name': 'A', 'is_child': False},
            {'first_name': 'B', 'is_child': False},
            {'first_name': 'C', 'is_child': False}
        ])
        inv.status = 'confirmed'
        inv.accommodation_requested = True
        inv.save()
        
        response = api_client.post('/api/admin/accommodations/auto-assign/', {'reset_previous': True})
        assert response.status_code == 200
        assert response.data['assigned_count'] == 0
        assert response.data['unassigned_count'] == 3

    def test_affinity_grouping(self, api_client, accommodation_with_rooms, invitation_factory):
        # Inv1 (2 adults) affine to Inv2 (2 adults)
        # Acc has Room 101 (2A), Room 102 (2A) -> Should fit both in same accommodation
        
        inv1 = invitation_factory("grp-1", "Group 1", [{'first_name': 'A'}, {'first_name': 'B'}])
        inv2 = invitation_factory("grp-2", "Group 2", [{'first_name': 'C'}, {'first_name': 'D'}])
        
        inv1.status = 'confirmed'; inv1.accommodation_requested = True; inv1.save()
        inv2.status = 'confirmed'; inv2.accommodation_requested = True; inv2.save()
        
        inv1.affinities.add(inv2)
        
        response = api_client.post('/api/admin/accommodations/auto-assign/', {'reset_previous': True})
        assert response.status_code == 200
        assert response.data['assigned_count'] == 4
        
        inv1.refresh_from_db()
        inv2.refresh_from_db()
        assert inv1.accommodation == accommodation_with_rooms
        assert inv2.accommodation == accommodation_with_rooms
