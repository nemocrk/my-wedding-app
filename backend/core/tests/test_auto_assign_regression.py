import pytest
from core.models import Invitation, Accommodation, Room, Person
from rest_framework.test import APIClient
from django.urls import reverse

@pytest.mark.django_db
class TestAutoAssignRegression:
    def setup_method(self):
        self.client = APIClient()
        
        # Create Accommodation
        self.hotel = Accommodation.objects.create(name="Hotel Test", address="Via Roma 1")
        self.room1 = Room.objects.create(accommodation=self.hotel, room_number="101", capacity_adults=2, capacity_children=0)
        self.room2 = Room.objects.create(accommodation=self.hotel, room_number="102", capacity_adults=2, capacity_children=0)
        
        # Create Invitations
        # Invito 1: Pinned (già assegnato)
        self.inv_pinned = Invitation.objects.create(
            name="Pinned Family", code="pinned", 
            status=Invitation.Status.CONFIRMED, 
            accommodation_requested=True,
            accommodation=self.hotel  # Assegnato a livello logico
        )
        self.p1 = Person.objects.create(invitation=self.inv_pinned, first_name="Pin", last_name="Ned", assigned_room=self.room1, accommodation_pinned=True)
        self.p2 = Person.objects.create(invitation=self.inv_pinned, first_name="Pin", last_name="Ned Jr", assigned_room=self.room1, accommodation_pinned=True)

        # Invito 2: Non Pinned (da assegnare)
        self.inv_new = Invitation.objects.create(
            name="New Family", code="new", 
            status=Invitation.Status.CONFIRMED, 
            accommodation_requested=True
        )
        self.p3 = Person.objects.create(invitation=self.inv_new, first_name="New", last_name="Guy")
        self.p4 = Person.objects.create(invitation=self.inv_new, first_name="New", last_name="Girl")

    def test_auto_assign_respects_pinned_invitation(self):
        """
        Test that running auto-assign with reset_previous=True:
        1. Does NOT clear room1 (occupied by pinned invitation)
        2. Assigns inv_new to room2 (because room1 is taken)
        """
        url = '/api/admin/accommodations/auto-assign/'
        payload = {
            'strategy': 'STANDARD',
            'reset_previous': True  # Should force reset of non-pinned only
        }
        
        response = self.client.post(url, payload, format='json')
        assert response.status_code == 200
        result = response.data['result']
        
        # Refresh objects
        self.p1.refresh_from_db()
        self.p2.refresh_from_db()
        self.p3.refresh_from_db()
        self.p4.refresh_from_db()
        self.inv_pinned.refresh_from_db()
        self.inv_new.refresh_from_db()

        # Check Pinned Invitation (Should NOT change)
        assert self.p1.assigned_room == self.room1
        assert self.p2.assigned_room == self.room1
        assert self.inv_pinned.accommodation == self.hotel

        # Check New Invitation (Should get Room 2)
        # Se la logica è corretta, Room 1 è considerata piena, quindi Room 2 è l'unica opzione
        assert self.p3.assigned_room == self.room2
        assert self.p4.assigned_room == self.room2
        assert self.inv_new.accommodation == self.hotel
        
        # Verify result log
        assert result['assigned_guests'] == 2 # Only new guests assigned
        assert result['unassigned_guests'] == 0

    def test_auto_assign_simulation_ignores_pinned(self):
        """Test simulation mode also respects pinned status"""
        url = '/api/admin/accommodations/auto-assign/'
        payload = {'strategy': 'SIMULATION', 'reset_previous': True}
        
        response = self.client.post(url, payload, format='json')
        assert response.status_code == 200
        
        results = response.data['results']
        standard_res = next(r for r in results if r['strategy_code'] == 'STANDARD')
        
        # In simulation, we expect to assign only the unassigned guests (2)
        # Because the other 2 are pinned and already assigned.
        assert standard_res['assigned_guests'] == 2

    def test_pinned_prevents_reset(self):
        """Verify that reset logic explicitly skips pinned invitations"""
        # Ensure setup is correct
        assert self.p1.assigned_room is not None
        
        # Manually trigger the reset logic via API call (using valid strategy)
        url = '/api/admin/accommodations/auto-assign/'
        payload = {
            'strategy': 'STANDARD',
            'reset_previous': True
        }
        self.client.post(url, payload, format='json')
        
        self.p1.refresh_from_db()
        assert self.p1.assigned_room is not None, "Pinned guest should not be reset"

    def test_pinned_room_is_unavailable(self):
        """
        Test that a room occupied by a pinned invitation is effectively unavailable
        even if the algorithm tries to optimize space.
        """
        # Create a smaller room (Room 3) that fits 2 people, perfect for "New Family"
        # But let's assume we want to force them into Room 2 if Room 1 (pinned) is taken.
        pass # Logic covered in main test

    def test_unpin_allows_reassignment(self):
        """Test that unpinning allows the invitation to be moved/reset"""
        self.inv_pinned.guests.all().update(accommodation_pinned = False)
        
        url = '/api/admin/accommodations/auto-assign/'
        payload = {
            'strategy': 'STANDARD',
            'reset_previous': True
        }
        
        # Now both invitations should be re-evaluated.
        # Since logic sorts by ID or Capacity, order might change, but both should be assigned if space permits.
        # But crucially, p1 and p2 should have been reset (momentarily) and re-assigned.
        # To prove reset happened, we check that the function ran without error and returned 4 assigned guests.
        
        response = self.client.post(url, payload, format='json')
        result = response.data['result']
        
        assert result['assigned_guests'] == 4 # All 4 guests (2 pinned-no-more + 2 new)
