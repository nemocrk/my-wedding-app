import pytest
from core.models import Invitation, GlobalConfig, Room

@pytest.mark.django_db
class TestInvitationModel:
    def test_token_generation(self, global_config):
        inv = Invitation.objects.create(code="family-rossi", name="Famiglia Rossi")
        token = inv.generate_verification_token(global_config.invitation_link_secret)
        
        assert len(token) == 16
        assert inv.verify_token(token, global_config.invitation_link_secret) is True
        assert inv.verify_token("wrong-token", global_config.invitation_link_secret) is False

@pytest.mark.django_db
class TestRoomModel:
    def test_available_slots_calculation(self, accommodation_with_rooms, invitation_factory):
        room = accommodation_with_rooms.rooms.get(room_number="102") # Cap: 2A, 1C
        
        # Initial state
        slots = room.available_slots()
        assert slots['adult_slots_free'] == 2
        assert slots['child_slots_free'] == 1
        
        # Assign 1 Adult
        inv = invitation_factory("test-1", "Test 1", [{'first_name': 'Mario', 'is_child': False}])
        guest = inv.guests.first()
        guest.assigned_room = room
        guest.save()
        
        slots = room.available_slots()
        assert slots['adult_slots_free'] == 1
        assert slots['child_slots_free'] == 1
        
        # Assign 1 Child (should take child slot)
        inv2 = invitation_factory("test-2", "Test 2", [{'first_name': 'Luigi', 'is_child': True}])
        child = inv2.guests.first()
        child.assigned_room = room
        child.save()
        
        slots = room.available_slots()
        assert slots['adult_slots_free'] == 1
        assert slots['child_slots_free'] == 0
        
        # Assign 2nd Child (should take adult slot)
        inv3 = invitation_factory("test-3", "Test 3", [{'first_name': 'Peach', 'is_child': True}])
        child2 = inv3.guests.first()
        child2.assigned_room = room
        child2.save()
        
        slots = room.available_slots()
        assert slots['adult_slots_free'] == 0
        assert slots['child_slots_free'] == 0

@pytest.mark.django_db
class TestGlobalConfig:
    def test_singleton_constraint(self, global_config):
        """Ensure we can't create a second config"""
        from django.core.exceptions import ValidationError
        with pytest.raises(ValidationError):
            GlobalConfig.objects.create(price_adult_meal=200)
