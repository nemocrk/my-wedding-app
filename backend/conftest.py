import pytest
from rest_framework.test import APIClient
from django.contrib.sessions.middleware import SessionMiddleware
from core.models import GlobalConfig, Accommodation, Room, Invitation, Person
from django.contrib.auth.models import User

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def admin_api_client(db):
    client = APIClient()
    user = User.objects.create_superuser('admin', 'admin@test.com', 'password')
    client.force_authenticate(user=user)
    return client

@pytest.fixture
def global_config(db):
    config, _ = GlobalConfig.objects.get_or_create(
        pk=1,
        defaults={
            'invitation_link_secret': 'test-secret',
            'price_adult_meal': 100,
            'price_child_meal': 50
        }
    )
    return config

@pytest.fixture
def accommodation_with_rooms(db):
    acc = Accommodation.objects.create(name="Hotel Test", address="Via Test 1")
    Room.objects.create(accommodation=acc, room_number="101", capacity_adults=2, capacity_children=0)
    Room.objects.create(accommodation=acc, room_number="102", capacity_adults=2, capacity_children=1)
    return acc

@pytest.fixture
def invitation_factory(db):
    def create_invitation(code, name, guests_config):
        inv = Invitation.objects.create(code=code, name=name)
        for g in guests_config:
            Person.objects.create(
                invitation=inv, 
                first_name=g['first_name'], 
                last_name=g.get('last_name', 'Doe'),
                is_child=g.get('is_child', False)
            )
        return inv
    return create_invitation
