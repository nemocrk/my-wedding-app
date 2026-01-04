import pytest
from core.models import Invitation, Person, Accommodation, Room

@pytest.mark.django_db
class TestAssignmentLogic:
    def test_basic_assignment(self, api_client, accommodation_with_rooms, invitation_factory):
        # 1 Invitation, 2 Adults -> Should fit in Room 102 (Largest room picked first)
        # Room 102: 2A + 1C (Total 3)
        # Room 101: 2A + 0C (Total 2)
        inv = invitation_factory("assign-1", "Assign 1", [
            {'first_name': 'A', 'is_child': False},
            {'first_name': 'B', 'is_child': False}
        ])
        inv.status = 'confirmed'
        inv.accommodation_requested = True
        inv.save()
        
        # Use STANDARD strategy to trigger execution mode
        response = api_client.post('/api/admin/accommodations/auto-assign/', {
            'reset_previous': True,
            'strategy': 'STANDARD'
        })
        assert response.status_code == 200
        
        # Access nested result and correct key names
        result = response.data['result']
        assert result['assigned_guests'] == 2
        
        inv.refresh_from_db()
        assert inv.accommodation == accommodation_with_rooms
        # Expect 102 because logic sorts by capacity desc
        assert inv.guests.first().assigned_room.room_number == "102"

    def test_capacity_overflow(self, api_client, invitation_factory):
        """
        Test atomic assignment behavior:
        - 3 Adults try to fit in 1 room with capacity 2
        - Algorithm does NOT do partial assignment: ALL or NOTHING
        - Expect 0 assigned, 3 unassigned (rollback)
        """
        small_acc = Accommodation.objects.create(name="Tiny House", address="Tiny Lane")
        Room.objects.create(accommodation=small_acc, room_number="T1", capacity_adults=2, capacity_children=0)
        
        inv = invitation_factory("assign-fail", "Assign Fail", [
            {'first_name': 'A', 'is_child': False},
            {'first_name': 'B', 'is_child': False},
            {'first_name': 'C', 'is_child': False}
        ])
        inv.status = 'confirmed'
        inv.accommodation_requested = True
        inv.save()
        
        response = api_client.post('/api/admin/accommodations/auto-assign/', {
            'reset_previous': True,
            'strategy': 'STANDARD'
        })
        assert response.status_code == 200
        
        result = response.data['result']
        # Atomic behavior: no partial assignments
        assert result['assigned_guests'] == 0
        assert result['unassigned_guests'] == 3

    def test_affinity_grouping(self, api_client, accommodation_with_rooms, invitation_factory):
        # Inv1 (2 adults) affine to Inv2 (2 adults)
        # Acc has Room 101 (2A), Room 102 (2A) -> Should fit both in same accommodation
        
        inv1 = invitation_factory("grp-1", "Group 1", [{'first_name': 'A'}, {'first_name': 'B'}])
        inv2 = invitation_factory("grp-2", "Group 2", [{'first_name': 'C'}, {'first_name': 'D'}])
        
        inv1.status = 'confirmed'; inv1.accommodation_requested = True; inv1.save()
        inv2.status = 'confirmed'; inv2.accommodation_requested = True; inv2.save()
        
        inv1.affinities.add(inv2)
        
        response = api_client.post('/api/admin/accommodations/auto-assign/', {
            'reset_previous': True,
            'strategy': 'STANDARD'
        })
        assert response.status_code == 200
        
        result = response.data['result']
        assert result['assigned_guests'] == 4
        
        inv1.refresh_from_db()
        inv2.refresh_from_db()
        assert inv1.accommodation == accommodation_with_rooms
        assert inv2.accommodation == accommodation_with_rooms
