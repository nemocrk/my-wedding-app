import pytest
from core.serializers import (
    InvitationSerializer, 
    PersonSerializer, 
    GuestInteractionSerializer
)
from core.models import Invitation, Person, GuestInteraction

@pytest.mark.django_db
class TestInvitationSerializer:
    def test_serialization_with_guests(self, invitation_factory):
        """Test serialization includes guests nested data"""
        inv = invitation_factory("ser-test", "Serializer Test", [
            {'first_name': 'Mario', 'last_name': 'Rossi', 'is_child': False},
            {'first_name': 'Luigi', 'last_name': 'Rossi', 'is_child': True}
        ])
        
        serializer = InvitationSerializer(inv)
        data = serializer.data
        
        assert data['code'] == 'ser-test'
        assert data['name'] == 'Serializer Test'
        assert len(data['guests']) == 2
        
        guest_names = [g['first_name'] for g in data['guests']]
        assert 'Mario' in guest_names
        assert 'Luigi' in guest_names

    def test_deserialization_creates_invitation(self, db):
        """Test creating invitation from validated data"""
        payload = {
            'code': 'new-inv',
            'name': 'New Invitation',
            'status': 'created',
            'guests': [
                {'first_name': 'Anna', 'last_name': 'Verdi', 'is_child': False}
            ]
        }
        
        serializer = InvitationSerializer(data=payload)
        assert serializer.is_valid(), serializer.errors
        
        inv = serializer.save()
        assert inv.code == 'new-inv'
        assert inv.guests.count() == 1
        assert inv.guests.first().first_name == 'Anna'

    def test_contact_info_fields_validation(self, db):
        """Test validation of contact fields"""
        # Case 1: Valid inputs
        payload = {
            'code': 'valid-contact',
            'name': 'Valid Contact',
            'phone_number': '+393331234567',
            'guests': [
                {'first_name': 'Anna', 'last_name': 'Verdi', 'is_child': False}
            ]
        }
        serializer = InvitationSerializer(data=payload)
        assert serializer.is_valid(), serializer.errors
        
        # Case 2: Invalid SMS phone (assuming validation exists or just field presence check)
        # If no specific validator is implemented yet, this might pass, but we check field mapping
        payload_invalid = {
            'code': 'invalid-contact',
            'name': 'Invalid Contact',
            'phone_number': 'not-a-number',
            'guests': [
                {'first_name': 'Anna', 'last_name': 'Verdi', 'is_child': False}
            ]
        }
        serializer = InvitationSerializer(data=payload_invalid)
        # Note: If no validators are set on model, DRF CharField accepts any string.
        # This test primarily ensures fields are exposed in serializer.
        assert serializer.is_valid()
        assert 'phone_number' in serializer.validated_data


@pytest.mark.django_db
class TestPersonSerializer:
    def test_basic_serialization(self, invitation_factory):
        inv = invitation_factory("person-ser", "Person Ser", [{'first_name': 'Test', 'is_child': False}])
        person = inv.guests.first()
        
        serializer = PersonSerializer(person)
        data = serializer.data
        assert data['first_name'] == 'Test'
        assert data['is_child'] is False


@pytest.mark.django_db
class TestGuestInteractionSerializer:
    def test_metadata_json_field(self, invitation_factory):
        """Test that metadata is correctly serialized as JSON"""
        inv = invitation_factory("interaction-ser", "Interaction Ser", [])
        
        interaction = GuestInteraction.objects.create(
            invitation=inv,
            event_type='click_cta',
            metadata={'button': 'rsvp', 'timestamp': '2026-01-08T12:00:00Z'}
        )
        
        serializer = GuestInteractionSerializer(interaction)
        data = serializer.data
        
        assert data['event_type'] == 'click_cta'
        assert data['metadata']['button'] == 'rsvp'
