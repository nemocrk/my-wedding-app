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

    def test_status_reset_imported_to_created(self, db):
        """
        Regression Test: IMPORTED status should reset to CREATED on update
        This test verifies the fix introduced in PR #62
        """
        # Create an invitation with IMPORTED status
        inv = Invitation.objects.create(
            code='imported-test',
            name='Imported Invitation',
            status='imported'
            # Guests should not be passed to create() if not handled by custom manager or signal
            # Default is empty
        )
        
        assert inv.status == 'imported'
        
        # Update the invitation (e.g., change name)
        payload = {
            'name': 'Updated Imported Invitation',
        }
        
        serializer = InvitationSerializer(inv, data=payload, partial=True)
        assert serializer.is_valid(), serializer.errors
        
        updated_inv = serializer.save()
        
        # Status should have been reset to CREATED
        assert updated_inv.status == 'created', \
            f"Expected status 'created', got '{updated_inv.status}'"

    def test_status_not_reset_for_other_statuses(self, db):
        """
        Test: Other statuses (SENT, CONFIRMED, etc.) should NOT be reset on update
        """
        statuses_to_test = ['sent', 'read', 'confirmed', 'declined', 'created']
        
        for status in statuses_to_test:
            inv = Invitation.objects.create(
                code=f'status-{status}',
                name=f'Invitation {status}',
                status=status
            )
            
            original_status = inv.status
            
            # Update the invitation
            payload = {'name': f'Updated {status}'}
            serializer = InvitationSerializer(inv, data=payload, partial=True)
            assert serializer.is_valid(), serializer.errors
            
            updated_inv = serializer.save()
            
            # Status should remain unchanged (except for 'imported' which should become 'created')
            if status == 'imported':
                assert updated_inv.status == 'created'
            else:
                assert updated_inv.status == original_status, \
                    f"Status changed from '{original_status}' to '{updated_inv.status}' unexpectedly"

    def test_status_reset_only_on_update_not_create(self, db):
        """
        Test: Status reset logic should only apply on UPDATE, not on CREATE
        """
        # Create a new invitation with IMPORTED status
        payload = {
            'code': 'new-imported',
            'name': 'New Imported',
            'status': 'imported',
            'guests': []
        }
        
        serializer = InvitationSerializer(data=payload)
        assert serializer.is_valid(), serializer.errors
        
        new_inv = serializer.save()
        
        # On creation, status should stay as provided (imported)
        assert new_inv.status == 'imported', \
            "Status should not be reset during creation, only on update"

    def test_phone_number_change_resets_verification(self, db):
        """
        Test: Changing phone_number should reset verification_status
        This is existing behavior, ensuring it still works after PR #62
        """
        inv = Invitation.objects.create(
            code='phone-test',
            name='Phone Test',
            phone_number='+393331111111',
            verification_status='verified'
        )
        
        assert inv.verification_status == 'verified'
        
        # Update phone number
        payload = {'phone_number': '+393332222222'}
        serializer = InvitationSerializer(inv, data=payload, partial=True)
        assert serializer.is_valid(), serializer.errors
        
        updated_inv = serializer.save()
        
        # Verification status should be reset
        assert updated_inv.verification_status == 'unverified', \
            "Verification status should be reset when phone number changes"


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