import pytest
from django.core.exceptions import ValidationError
from core.models import (
    InvitationLabel, Invitation, Person, Accommodation, Room,
    GlobalConfig, ConfigurableText
)

@pytest.mark.django_db
class TestModelSmoke:
    """Smoke tests to verify all models can be created without errors"""
    
    def test_create_global_config(self):
        """Test GlobalConfig singleton creation"""
        config = GlobalConfig.objects.create(
            price_adult_meal=120.00,
            price_child_meal=60.00
        )
        assert config.id is not None
        assert config.price_adult_meal == 120.00
        
        # Test singleton constraint
        with pytest.raises(ValidationError):
            GlobalConfig.objects.create(
                price_adult_meal=100.00
            )
    
    def test_create_configurable_text(self):
        """Test ConfigurableText creation"""
        text = ConfigurableText.objects.create(
            key="test.key",
            language="it",
            content="<p>Test Content</p>"
        )
        assert text.id is not None
        assert text.key == "test.key"
    
    def test_create_invitation_label(self):
        """Test InvitationLabel creation"""
        label = InvitationLabel.objects.create(
            name="Smoke Test Label",
            color="#123456"
        )
        assert label.id is not None
        assert label.name == "Smoke Test Label"
    
    def test_create_accommodation_with_rooms(self):
        """Test Accommodation and Room creation"""
        acc = Accommodation.objects.create(
            name="Smoke Hotel",
            address="Smoke Street 1"
        )
        room = Room.objects.create(
            accommodation=acc,
            room_number="S1",
            capacity_adults=3,
            capacity_children=1
        )
        assert acc.id is not None
        assert room.accommodation == acc
        assert acc.total_capacity() == 4
    
    def test_create_invitation_with_labels_and_pinning(self):
        """Test Invitation with new fields (labels, accommodation_pinned)"""
        label1 = InvitationLabel.objects.create(name="L1")
        label2 = InvitationLabel.objects.create(name="L2")
        
        inv = Invitation.objects.create(
            name="Smoke Inv",
            code="smoke-inv",
            accommodation_pinned=True
        )
        inv.labels.add(label1, label2)
        
        assert inv.id is not None
        assert inv.accommodation_pinned is True
        assert inv.labels.count() == 2
    
    def test_create_person_with_room_assignment(self):
        """Test Person creation with room assignment"""
        acc = Accommodation.objects.create(name="Hotel", address="Street")
        room = Room.objects.create(accommodation=acc, room_number="R1", capacity_adults=2)
        
        inv = Invitation.objects.create(name="Person Test", code="person-test")
        person = Person.objects.create(
            invitation=inv,
            first_name="Smoke",
            last_name="Test",
            assigned_room=room
        )
        
        assert person.id is not None
        assert person.assigned_room == room
        assert room.occupied_count() == 1


@pytest.mark.django_db
class TestEndpointSmoke:
    """Smoke tests for new endpoints - verify they respond without 500 errors"""
    
    def test_invitation_labels_list(self, api_client):
        """Test GET /api/admin/invitation-labels/"""
        response = api_client.get('/api/admin/invitation-labels/')
        assert response.status_code in [200, 401]  # 401 if auth required
    
    def test_invitations_list_with_filters(self, api_client):
        """Test GET /api/admin/invitations/ with new filter params"""
        # Create test data
        label = InvitationLabel.objects.create(name="Filter Test")
        inv = Invitation.objects.create(name="Test", code="test", accommodation_pinned=True)
        inv.labels.add(label)
        
        # Test filters
        response = api_client.get(f'/api/admin/invitations/?label={label.id}')
        assert response.status_code in [200, 401]
        
        response = api_client.get('/api/admin/invitations/?accommodation_pinned=true')
        assert response.status_code in [200, 401]
    
    def test_bulk_send_endpoint(self, api_client):
        """Test POST /api/admin/invitations/bulk-send/"""
        inv = Invitation.objects.create(name="Bulk", code="bulk", status=Invitation.Status.CREATED)
        
        response = api_client.post(
            '/api/admin/invitations/bulk-send/',
            {'invitation_ids': [inv.id]},
            format='json'
        )
        # Should succeed or return 401 if auth required
        assert response.status_code in [200, 401]
    
    def test_auto_assign_endpoint(self, api_client):
        """Test POST /api/admin/accommodations/auto-assign/"""
        response = api_client.post(
            '/api/admin/accommodations/auto-assign/',
            {'strategy': 'SIMULATION'},
            format='json'
        )
        assert response.status_code in [200, 401]
    
    def test_configurable_text_endpoint(self, api_client):
        """Test GET /api/admin/texts/"""
        response = api_client.get('/api/admin/texts/')
        assert response.status_code in [200, 401]
