import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.db import IntegrityError
from core.models import Invitation, InvitationLabel, ConfigurableText, Person, Accommodation, Room, GlobalConfig

@pytest.mark.django_db
class TestInvitationAdminViews:
    def setup_method(self):
        self.client = APIClient()
        # Create test data
        self.label1 = InvitationLabel.objects.create(name="VIP", color="#FF0000")
        self.label2 = InvitationLabel.objects.create(name="Friends", color="#00FF00")
        
        self.inv1 = Invitation.objects.create(name="Inv1", code="C1", status=Invitation.Status.CREATED)
        self.inv2 = Invitation.objects.create(name="Inv2", code="C2", status=Invitation.Status.CREATED)
        self.inv3 = Invitation.objects.create(name="Inv3", code="C3", status=Invitation.Status.CREATED)

    def test_bulk_send_success(self):
        url = '/api/admin/invitations/bulk-send/'
        data = {'invitation_ids': [self.inv1.id, self.inv2.id]}
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['updated_count'] == 2
        
        self.inv1.refresh_from_db()
        self.inv2.refresh_from_db()
        self.inv3.refresh_from_db()
        
        assert self.inv1.status == Invitation.Status.SENT
        assert self.inv2.status == Invitation.Status.SENT
        assert self.inv3.status == Invitation.Status.CREATED

    def test_bulk_send_validation_error(self):
        url = '/api/admin/invitations/bulk-send/'
        # Missing IDs
        response = self.client.post(url, {}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
        # Invalid IDs
        response = self.client.post(url, {'invitation_ids': [99999]}, format='json')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_bulk_labels_add(self):
        url = '/api/admin/invitations/bulk-labels/'
        data = {
            'invitation_ids': [self.inv1.id, self.inv2.id],
            'label_ids': [self.label1.id],
            'action': 'add'
        }
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        self.inv1.refresh_from_db()
        self.inv2.refresh_from_db()
        
        assert self.label1 in self.inv1.labels.all()
        assert self.label1 in self.inv2.labels.all()

    def test_bulk_labels_remove(self):
        # Pre-assign
        self.inv1.labels.add(self.label1, self.label2)
        
        url = '/api/admin/invitations/bulk-labels/'
        data = {
            'invitation_ids': [self.inv1.id],
            'label_ids': [self.label1.id],
            'action': 'remove'
        }
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        self.inv1.refresh_from_db()
        labels = self.inv1.labels.all()
        assert self.label1 not in labels
        assert self.label2 in labels

    def test_mark_as_sent_single(self):
        url = f'/api/admin/invitations/{self.inv1.id}/mark-as-sent/'
        response = self.client.post(url)
        assert response.status_code == status.HTTP_200_OK
        self.inv1.refresh_from_db()
        assert self.inv1.status == Invitation.Status.SENT

    def test_generate_link(self):
        url = f'/api/admin/invitations/{self.inv1.id}/generate_link/'
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert 'url' in response.data
        assert 'token' in response.data

    def test_search_invitation(self):
        url = f'/api/admin/invitations/search/?code={self.inv1.code}'
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == self.inv1.id

    def test_invitation_filters(self):
        # Setup specific statuses
        self.inv1.status = Invitation.Status.CONFIRMED
        self.inv1.save()
        self.inv2.labels.add(self.label1)
        
        # Test Status Filter
        url = '/api/admin/invitations/?status=confirmed'
        response = self.client.get(url)
        
        # DRF can return 'results' (paginated) or list (non-paginated)
        data = response.data
        if isinstance(data, list):
            results = data
        else:
            results = data.get('results', [])
            
        assert len(results) == 1
        assert results[0]['id'] == self.inv1.id
        
        # Test Label Filter
        url = f'/api/admin/invitations/?label={self.label1.id}'
        response = self.client.get(url)
        
        data = response.data
        if isinstance(data, list):
            results = data
        else:
            results = data.get('results', [])

        assert len(results) == 1
        assert results[0]['id'] == self.inv2.id


@pytest.mark.django_db
class TestConfigurableTextViewSet:
    def setup_method(self):
        self.client = APIClient()
        self.text1 = ConfigurableText.objects.create(key="welcome", language="it", content="Benvenuti")
        self.text2 = ConfigurableText.objects.create(key="welcome", language="en", content="Welcome")

    def test_list_filter_lang(self):
        url = '/api/admin/texts/?lang=en' 
        response = self.client.get(url)
        # Check standard list response structure
        data = response.data
        if isinstance(data, list):
            results = data
        else:
            results = data.get('results', [])
            
        assert len(results) == 1
        assert results[0]['content'] == "Welcome"

    def test_retrieve_fallback(self):
        # Retrieve IT specific
        url = '/api/admin/texts/welcome/?lang=it'
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['content'] == "Benvenuti"

    def test_update_or_create(self):
        # Create new key
        url = '/api/admin/texts/new-key/?lang=it' 
        data = {'content': 'Nuovo Contenuto'}
        response = self.client.put(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert ConfigurableText.objects.filter(key="new-key", language="it").exists()
        
        # Update existing
        url = '/api/admin/texts/welcome/?lang=it'
        data = {'content': 'Benvenuti Modificato'}
        response = self.client.put(url, data)
        assert response.status_code == status.HTTP_200_OK
        self.text1.refresh_from_db()
        assert self.text1.content == 'Benvenuti Modificato'

@pytest.mark.django_db
class TestPublicConfigViews:
    def setup_method(self):
        self.client = APIClient()
        ConfigurableText.objects.create(key="k1", language="it", content="Ciao")
        ConfigurableText.objects.create(key="k1", language="en", content="Hello")
        ConfigurableText.objects.create(key="k2", language="it", content="Mondo")

    def test_public_texts_fallback(self):
        # Request EN (should get k1=Hello, k2=Mondo fallback)
        url = '/api/public/texts/?lang=en' 
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data['k1'] == "Hello"
        assert data['k2'] == "Mondo"

    def test_public_languages(self):
        url = '/api/public/languages/'
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
