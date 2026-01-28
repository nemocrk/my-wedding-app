import pytest
from core.models import InvitationLabel, Invitation, Person
from core.serializers import InvitationLabelSerializer, InvitationSerializer

@pytest.mark.django_db
class TestInvitationLabelSerializer:
    def test_serialize_label(self):
        """Test serializing a label"""
        label = InvitationLabel.objects.create(name="VIP", color="#FF0000")
        serializer = InvitationLabelSerializer(label)
        data = serializer.data
        assert data['name'] == "VIP"
        assert data['color'] == "#FF0000"
        assert 'id' in data

    def test_validate_label_valid(self):
        """Test validating valid label data"""
        data = {"name": "Friends", "color": "#00FF00"}
        serializer = InvitationLabelSerializer(data=data)
        assert serializer.is_valid()
        label = serializer.save()
        assert label.name == "Friends"

    def test_validate_label_missing_name(self):
        """Test validation fails if name is missing"""
        data = {"color": "#00FF00"}
        serializer = InvitationLabelSerializer(data=data)
        assert not serializer.is_valid()
        assert 'name' in serializer.errors

    def test_validate_label_duplicate_name(self):
        """Test validation fails if name is duplicate"""
        InvitationLabel.objects.create(name="Duplicate")
        data = {"name": "Duplicate", "color": "#123456"}
        serializer = InvitationLabelSerializer(data=data)
        assert not serializer.is_valid()
        assert 'name' in serializer.errors

@pytest.mark.django_db
class TestInvitationSerializerWithLabels:
    def test_create_invitation_with_labels(self):
        """Test creating an invitation with labels using label_ids"""
        label1 = InvitationLabel.objects.create(name="L1")
        label2 = InvitationLabel.objects.create(name="L2")
        
        data = {
            "name": "Test Invite",
            "code": "test-code",
            "guests": [{"first_name": "Mario", "last_name": "Rossi", "is_child": False, "assigned_room": None, "dietary_requirements": "", "not_coming": False, "accommodation_pinned": True}],
            "label_ids": [label1.id, label2.id],
            "accommodation_pinned": True
        }
        
        serializer = InvitationSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        invitation = serializer.save()
        
        assert invitation.labels.count() == 2
        assert label1 in invitation.labels.all()
        assert invitation.guests.count() == 1
        assert invitation.guests.first().first_name == "Mario"
        assert invitation.guests.first().accommodation_pinned is True

    def test_update_invitation_labels(self):
        """Test updating invitation labels"""
        invitation = Invitation.objects.create(name="Update Test", code="update-test")
        label1 = InvitationLabel.objects.create(name="Old")
        label2 = InvitationLabel.objects.create(name="New")
        invitation.labels.add(label1)
        
        # Replace labels
        data = {
            "label_ids": [label2.id]
        }
        
        serializer = InvitationSerializer(invitation, data=data, partial=True)
        assert serializer.is_valid()
        updated_invitation = serializer.save()
        
        assert updated_invitation.labels.count() == 1
        assert label2 in updated_invitation.labels.all()
        assert label1 not in updated_invitation.labels.all()

    def test_serialize_invitation_includes_labels(self):
        """Test serialization includes nested labels"""
        invitation = Invitation.objects.create(name="Serialize Test", code="ser-test")
        label = InvitationLabel.objects.create(name="ShowMe", color="#ABCDEF")
        invitation.labels.add(label)
        
        serializer = InvitationSerializer(invitation)
        data = serializer.data
        
        assert 'labels' in data
        assert len(data['labels']) == 1
        assert data['labels'][0]['name'] == "ShowMe"
        assert data['labels'][0]['color'] == "#ABCDEF"
