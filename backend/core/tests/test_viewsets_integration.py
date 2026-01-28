import pytest
from core.models import Invitation, InvitationLabel, WhatsAppMessageQueue, Person
from rest_framework.test import APIClient
from django.urls import reverse
import json

@pytest.mark.django_db
class TestInvitationLabelViewSet:
    def setup_method(self):
        self.client = APIClient()
        
    def test_create_label(self):
        """Test creating a label via API"""
        url = '/api/admin/invitation-labels/'
        data = {"name": "VIP", "color": "#FF0000"}
        response = self.client.post(url, data, format='json')
        assert response.status_code == 201
        assert response.data['name'] == "VIP"
        assert InvitationLabel.objects.filter(name="VIP").exists()

    def test_list_labels(self):
        """Test listing all labels"""
        InvitationLabel.objects.create(name="Family")
        InvitationLabel.objects.create(name="Friends")
        
        url = '/api/admin/invitation-labels/'
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 2

    def test_update_label(self):
        """Test updating a label"""
        label = InvitationLabel.objects.create(name="OldName", color="#000000")
        url = f'/api/admin/invitation-labels/{label.id}/'
        data = {"name": "NewName", "color": "#FFFFFF"}
        response = self.client.put(url, data, format='json')
        assert response.status_code == 200
        label.refresh_from_db()
        assert label.name == "NewName"
        assert label.color == "#FFFFFF"

    def test_delete_label(self):
        """Test deleting a label"""
        label = InvitationLabel.objects.create(name="DeleteMe")
        url = f'/api/admin/invitation-labels/{label.id}/'
        response = self.client.delete(url)
        assert response.status_code == 204
        assert not InvitationLabel.objects.filter(id=label.id).exists()

    def test_search_label(self):
        """Test searching labels by name"""
        InvitationLabel.objects.create(name="Alpha")
        InvitationLabel.objects.create(name="Beta")
        InvitationLabel.objects.create(name="Gamma")
        
        url = '/api/admin/invitation-labels/?search=Beta'
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]['name'] == "Beta"


@pytest.mark.django_db
class TestInvitationViewSetFilters:
    def setup_method(self):
        self.client = APIClient()
        
        # Create Labels
        self.label_vip = InvitationLabel.objects.create(name="VIP")
        self.label_family = InvitationLabel.objects.create(name="Family")
        
        # Create Invitations
        self.inv1 = Invitation.objects.create(
            name="Inv1", code="inv1", 
            status=Invitation.Status.CONFIRMED,
            origin=Invitation.Origin.GROOM
        )
        self.inv1.labels.add(self.label_vip)
        
        self.inv2 = Invitation.objects.create(
            name="Inv2", code="inv2", 
            status=Invitation.Status.SENT,
            origin=Invitation.Origin.BRIDE
        )
        self.inv2.labels.add(self.label_family)
        
        self.inv3 = Invitation.objects.create(
            name="Inv3", code="inv3", 
            status=Invitation.Status.CONFIRMED,
            origin=Invitation.Origin.GROOM
        )
        self.inv3.labels.add(self.label_vip, self.label_family)

    def test_filter_by_status(self):
        """Test filtering invitations by status"""
        url = '/api/admin/invitations/?status=confirmed'
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 2  # inv1, inv3

    def test_filter_by_label(self):
        """Test filtering invitations by label ID"""
        url = f'/api/admin/invitations/?label={self.label_vip.id}'
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 2  # inv1, inv3

    def test_filter_by_origin(self):
        """Test filtering invitations by origin"""
        url = '/api/admin/invitations/?origin=groom'
        response = self.client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 2  # inv1, inv3

    def test_ordering_by_name(self):
        """Test ordering invitations by name"""
        url = '/api/admin/invitations/?ordering=name'
        response = self.client.get(url)
        assert response.status_code == 200
        names = [inv['name'] for inv in response.data]
        assert names == sorted(names)


@pytest.mark.django_db
class TestBulkActions:
    def setup_method(self):
        self.client = APIClient()
        
        # Create Invitations with phone numbers
        self.inv1 = Invitation.objects.create(
            name="Bulk1", code="b1", 
            status=Invitation.Status.CREATED,
            phone_number="1234567890"
        )
        self.inv2 = Invitation.objects.create(
            name="Bulk2", code="b2", 
            status=Invitation.Status.CREATED,
            phone_number="0987654321"
        )
        self.inv3 = Invitation.objects.create(
            name="Bulk3", code="b3", 
            status=Invitation.Status.SENT  # Already sent
        )

    def test_bulk_send_success(self):
        """Test bulk send marks invitations as SENT"""
        url = '/api/admin/invitations/bulk-send/'
        data = {"invitation_ids": [self.inv1.id, self.inv2.id]}
        
        response = self.client.post(url, data, format='json')
        assert response.status_code == 200
        assert response.data['updated_count'] == 2
        
        self.inv1.refresh_from_db()
        self.inv2.refresh_from_db()
        
        assert self.inv1.status == Invitation.Status.SENT
        assert self.inv2.status == Invitation.Status.SENT

    def test_bulk_send_empty_list(self):
        """Test bulk send with empty invitation_ids returns error"""
        url = '/api/admin/invitations/bulk-send/'
        data = {"invitation_ids": []}
        
        response = self.client.post(url, data, format='json')
        assert response.status_code == 400
        assert 'error' in response.data

    def test_bulk_send_invalid_ids(self):
        """Test bulk send with non-existent IDs returns error"""
        url = '/api/admin/invitations/bulk-send/'
        data = {"invitation_ids": [9999, 8888]}
        
        response = self.client.post(url, data, format='json')
        assert response.status_code == 404
        assert 'missing_ids' in response.data

    def test_bulk_send_partial_invalid(self):
        """Test bulk send with mix of valid/invalid IDs"""
        url = '/api/admin/invitations/bulk-send/'
        data = {"invitation_ids": [self.inv1.id, 9999]}
        
        response = self.client.post(url, data, format='json')
        assert response.status_code == 404
        assert 9999 in response.data['missing_ids']
        
        # Verify no partial update happened (atomic)
        self.inv1.refresh_from_db()
        assert self.inv1.status == Invitation.Status.CREATED

    def test_bulk_send_idempotent(self):
        """Test bulk send is idempotent (can be called multiple times)"""
        url = '/api/admin/invitations/bulk-send/'
        data = {"invitation_ids": [self.inv3.id]}
        
        response = self.client.post(url, data, format='json')
        assert response.status_code == 200
        
        self.inv3.refresh_from_db()
        assert self.inv3.status == Invitation.Status.SENT


@pytest.mark.django_db
class TestMarkAsReadAction:
    def setup_method(self):
        self.client = APIClient()
        
        self.inv_sent = Invitation.objects.create(
            name="SentInv", code="sent", 
            status=Invitation.Status.SENT
        )
        
        self.inv_read = Invitation.objects.create(
            name="ReadInv", code="read", 
            status=Invitation.Status.READ
        )

    def test_mark_as_read_from_sent(self):
        """Test marking a sent invitation as read"""
        url = f'/api/admin/invitations/{self.inv_sent.id}/mark-as-read/'
        response = self.client.post(url)
        
        assert response.status_code == 200
        assert response.data['status'] == 'read'
        assert response.data['transition'] == 'sent -> read'
        
        self.inv_sent.refresh_from_db()
        assert self.inv_sent.status == Invitation.Status.READ

    def test_mark_as_read_idempotent(self):
        """Test marking an already-read invitation is idempotent"""
        url = f'/api/admin/invitations/{self.inv_read.id}/mark-as-read/'
        response = self.client.post(url)
        
        assert response.status_code == 200
        assert response.data['transition'] == 'none'
        
        self.inv_read.refresh_from_db()
        assert self.inv_read.status == Invitation.Status.READ


@pytest.mark.django_db
class TestInvitationViewSetWithLabels:
    def setup_method(self):
        self.client = APIClient()
        self.label = InvitationLabel.objects.create(name="TestLabel")

    def test_create_invitation_with_labels(self):
        """Test creating invitation with labels via API"""
        url = '/api/admin/invitations/'
        data = {
            "name": "Test Family",
            "code": "test-family",
            "guests": [{"first_name": "John", "last_name": "Doe"}],
            "label_ids": [self.label.id]
        }
        
        response = self.client.post(url, data, format='json')
        assert response.status_code == 201
        
        invitation = Invitation.objects.get(code="test-family")
        assert invitation.labels.count() == 1
        assert self.label in invitation.labels.all()

    def test_update_invitation_labels(self):
        """Test updating invitation labels via PATCH"""
        invitation = Invitation.objects.create(name="Update Test", code="update")
        new_label = InvitationLabel.objects.create(name="NewLabel")
        
        url = f'/api/admin/invitations/{invitation.id}/'
        data = {"label_ids": [new_label.id]}
        
        response = self.client.patch(url, data, format='json')
        assert response.status_code == 200
        
        invitation.refresh_from_db()
        assert invitation.labels.count() == 1
        assert new_label in invitation.labels.all()

    def test_list_shows_labels(self):
        """Test that list endpoint includes labels in response"""
        invitation = Invitation.objects.create(name="List Test", code="list")
        invitation.labels.add(self.label)
        
        url = '/api/admin/invitations/'
        response = self.client.get(url)
        
        assert response.status_code == 200
        inv_data = next(inv for inv in response.data if inv['code'] == 'list')
        assert 'labels' in inv_data
        assert len(inv_data['labels']) == 1
        assert inv_data['labels'][0]['name'] == 'TestLabel'
