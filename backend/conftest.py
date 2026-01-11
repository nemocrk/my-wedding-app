import pytest
import os
from rest_framework.test import APIClient
from core.models import Invitation, Person, GlobalConfig, Accommodation, Room, WhatsAppSessionStatus, WhatsAppTemplate

@pytest.fixture(autouse=True)
def set_test_env():
    """Set environment variables for testing"""
    os.environ['DJANGO_TEST_MODE'] = 'True'
    yield
    if 'DJANGO_TEST_MODE' in os.environ:
        del os.environ['DJANGO_TEST_MODE']

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def admin_api_client(db):
    """Client autenticato come admin (se necessario in futuro, per ora stub)"""
    # In un caso reale creeremmo un superuser e faremmo login
    # user = User.objects.create_superuser('admin', 'admin@test.com', 'password')
    # client = APIClient()
    # client.force_authenticate(user=user)
    # return client
    return APIClient()

@pytest.fixture
def global_config(db):
    config, _ = GlobalConfig.objects.get_or_create(
        pk=1,
        defaults={
            'invitation_link_secret': 'test-secret',
            'unauthorized_message': 'Access Denied',
            'letter_text': 'Hello {guest_names}, welcome to {family_name} wedding!',
            'whatsapp_groom_number': '393330000000',
            'whatsapp_bride_number': '393330000001',
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
    def create_invitation(code, name, guests_data):
        WhatsAppSessionStatus.objects.get_or_create(session_type='groom')
        inv = Invitation.objects.create(code=code, name=name, status=Invitation.Status.CREATED, origin='groom')
        for g in guests_data:
            Person.objects.create(invitation=inv, **g)
        return inv
    return create_invitation

@pytest.fixture
def accommodation_factory(db):
    def create_accommodation(name, rooms_data):
        acc = Accommodation.objects.create(name=name, address="Test Address")
        for r in rooms_data:
            Room.objects.create(
                accommodation=acc, 
                room_number=r['room_number'], 
                capacity_adults=r.get('capacity_adults', 2),
                capacity_children=r.get('capacity_children', 0)
            )
        return acc
    return create_accommodation

@pytest.fixture
def whatsapp_template_factory(db):
    def create_template(status, content):
        return WhatsAppTemplate.objects.create(
            name=f"Template {status}",
            condition=WhatsAppTemplate.Condition.STATUS_CHANGE,
            trigger_status=status,
            content=content,
            is_active=True
        )
    return create_template
