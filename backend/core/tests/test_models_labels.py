import pytest
from django.db import IntegrityError
from core.models import InvitationLabel, Invitation

@pytest.mark.django_db
class TestInvitationLabelModel:
    def test_create_label_success(self):
        """Test creating a label with valid data"""
        label = InvitationLabel.objects.create(name="VIP", color="#FF5733")
        assert label.name == "VIP"
        assert label.color == "#FF5733"
        assert label.id is not None

    def test_create_label_default_color(self):
        """Test creating a label uses default color"""
        label = InvitationLabel.objects.create(name="Family")
        assert label.color == "#CCCCCC"

    def test_label_name_unique(self):
        """Test that label names must be unique"""
        InvitationLabel.objects.create(name="Unique")
        with pytest.raises(IntegrityError):
            InvitationLabel.objects.create(name="Unique")

    def test_str_representation(self):
        """Test string representation"""
        label = InvitationLabel.objects.create(name="Colleghi")
        assert str(label) == "Colleghi"

@pytest.mark.django_db
class TestInvitationModelNewFields:
    def test_accommodation_pinned_default(self):
        """Test accommodation_pinned default value"""
        invitation = Invitation.objects.create(name="Rossi", code="rossi-test")
        assert invitation.accommodation_pinned is False

    def test_add_labels_to_invitation(self):
        """Test adding labels to an invitation (ManyToMany)"""
        invitation = Invitation.objects.create(name="Bianchi", code="bianchi-test")
        label1 = InvitationLabel.objects.create(name="VIP")
        label2 = InvitationLabel.objects.create(name="Friends")

        invitation.labels.add(label1, label2)
        
        assert invitation.labels.count() == 2
        assert label1 in invitation.labels.all()
        assert label2 in invitation.labels.all()

    def test_remove_labels_from_invitation(self):
        """Test removing labels from an invitation"""
        invitation = Invitation.objects.create(name="Verdi", code="verdi-test")
        label = InvitationLabel.objects.create(name="RemoveMe")
        invitation.labels.add(label)
        
        assert invitation.labels.count() == 1
        
        invitation.labels.remove(label)
        assert invitation.labels.count() == 0

    def test_label_deletion_cascade(self):
        """Test that deleting a label removes it from associated invitations"""
        invitation = Invitation.objects.create(name="Neri", code="neri-test")
        label = InvitationLabel.objects.create(name="DeleteMe")
        invitation.labels.add(label)
        
        assert invitation.labels.count() == 1
        
        label.delete()
        
        # Refresh from DB
        invitation.refresh_from_db()
        assert invitation.labels.count() == 0

    def test_filter_invitation_by_label(self):
        """Test filtering invitations by label"""
        label_vip = InvitationLabel.objects.create(name="VIP")
        label_family = InvitationLabel.objects.create(name="Family")
        
        inv1 = Invitation.objects.create(name="User1", code="u1")
        inv1.labels.add(label_vip)
        
        inv2 = Invitation.objects.create(name="User2", code="u2")
        inv2.labels.add(label_family)
        
        inv3 = Invitation.objects.create(name="User3", code="u3")
        inv3.labels.add(label_vip, label_family)
        
        vip_invites = Invitation.objects.filter(labels__name="VIP")
        assert vip_invites.count() == 2
        assert inv1 in vip_invites
        assert inv3 in vip_invites
        assert inv2 not in vip_invites
