import pytest
from core.models import Invitation, Person, Accommodation, Room

@pytest.mark.django_db
class TestAssignmentLogic:
    
    # --- Core Mechanics Tests ---

    def test_basic_assignment(self, api_client, accommodation_with_rooms, invitation_factory):
        """Test basic assignment using STANDARD strategy"""
        inv = invitation_factory("assign-1", "Assign 1", [
            {'first_name': 'A', 'is_child': False},
            {'first_name': 'B', 'is_child': False}
        ])
        inv.status = 'confirmed'
        inv.accommodation_requested = True
        inv.save()
        
        response = api_client.post('/api/admin/accommodations/auto-assign/', {
            'reset_previous': True,
            'strategy': 'STANDARD'
        })
        assert response.status_code == 200
        assert response.data['result']['assigned_guests'] == 2
        
        inv.refresh_from_db()
        assert inv.accommodation == accommodation_with_rooms

    def test_capacity_overflow(self, api_client, invitation_factory):
        """Test atomic assignment: either all guests in an invitation fit, or none."""
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
        assert result['assigned_guests'] == 0
        assert result['unassigned_guests'] == 3

    def test_affinity_grouping(self, api_client, accommodation_with_rooms, invitation_factory):
        """Test that affine groups are processed together"""
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
        assert response.data['result']['assigned_guests'] == 4
        
        inv1.refresh_from_db()
        assert inv1.accommodation == accommodation_with_rooms

    # --- Strategy Specific Tests ---

    def test_simulation_mode(self, api_client, accommodation_with_rooms, invitation_factory):
        """Test that SIMULATION mode returns comparative results without modifying DB"""
        inv = invitation_factory("sim-1", "Sim 1", [{'first_name': 'A'}])
        inv.status = 'confirmed'; inv.accommodation_requested = True; inv.save()

        # No strategy provided = SIMULATION
        response = api_client.post('/api/admin/accommodations/auto-assign/', {'reset_previous': True})
        
        assert response.status_code == 200
        assert response.data['mode'] == 'SIMULATION'
        assert isinstance(response.data['results'], list)
        assert len(response.data['results']) >= 6 # We have 6 strategies
        
        # Verify DB was NOT modified (Invitation still unassigned)
        inv.refresh_from_db()
        assert inv.accommodation is None

    @pytest.mark.parametrize("strategy_code", [
        'STANDARD',
        'SPACE_OPTIMIZER',
        'CHILDREN_FIRST',
        'PERFECT_MATCH',
        'SMALLEST_FIRST',
        'AFFINITY_CLUSTER'
    ])
    def test_all_strategies_execution(self, api_client, strategy_code, accommodation_with_rooms, invitation_factory):
        """Smoke test to ensure all strategies run without error"""
        inv = invitation_factory(f"strat-{strategy_code}", "Strat Test", [{'first_name': 'A'}])
        inv.status = 'confirmed'; inv.accommodation_requested = True; inv.save()

        response = api_client.post('/api/admin/accommodations/auto-assign/', {
            'reset_previous': True,
            'strategy': strategy_code
        })
        
        assert response.status_code == 200, f"Strategy {strategy_code} failed"
        assert response.data['mode'] == 'EXECUTION'
        assert response.data['result']['assigned_guests'] == 1
        
        inv.refresh_from_db()
        assert inv.accommodation is not None

    def test_children_first_strategy(self, api_client, invitation_factory):
        """Test that CHILDREN_FIRST prioritizes rooms with child capacity"""
        # Acc 1: 2 Adults, 0 Children
        acc_adult = Accommodation.objects.create(name="Adult Only", address="A St")
        Room.objects.create(accommodation=acc_adult, room_number="101", capacity_adults=2, capacity_children=0)
        
        # Acc 2: 2 Adults, 2 Children
        acc_family = Accommodation.objects.create(name="Family Resort", address="F St")
        Room.objects.create(accommodation=acc_family, room_number="201", capacity_adults=2, capacity_children=2)

        # Family with kids
        inv_family = invitation_factory("fam-kids", "Family", [
            {'first_name': 'Mom', 'is_child': False},
            {'first_name': 'Kid', 'is_child': True}
        ])
        inv_family.status = 'confirmed'; inv_family.accommodation_requested = True; inv_family.save()

        # Execute CHILDREN_FIRST
        response = api_client.post('/api/admin/accommodations/auto-assign/', {
            'reset_previous': True,
            'strategy': 'CHILDREN_FIRST'
        })
        
        assert response.status_code == 200
        assert response.data['result']['assigned_guests'] == 2
        
        inv_family.refresh_from_db()
        # Should be assigned to Family Resort because it has child slots, 
        # and strategy sorts rooms by child capacity desc.
        assert inv_family.accommodation == acc_family
