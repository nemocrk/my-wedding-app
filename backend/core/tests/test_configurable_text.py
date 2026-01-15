"""Tests for ConfigurableText model, serializer, and API endpoints."""
import pytest
from django.urls import reverse
from rest_framework import status
from core.models import ConfigurableText


@pytest.mark.django_db
class TestConfigurableTextModel:
    """Test ConfigurableText model functionality."""
    
    def test_create_configurable_text(self):
        """Test creating a ConfigurableText instance."""
        text = ConfigurableText.objects.create(
            key='envelope.front.content',
            language='it',
            content='<span style="font-family: serif;">Benvenuti al nostro matrimonio</span>',
            metadata={'font': 'serif', 'size': '24px'}
        )
        assert text.key == 'envelope.front.content'
        assert text.language == 'it'
        assert 'Benvenuti' in text.content
        assert text.metadata['font'] == 'serif'
        assert text.created_at is not None
        assert text.updated_at is not None
    
    def test_unique_key_language_constraint(self):
        """Test that (key, language) enforces uniqueness (i18n support)."""
        # Prima entry: key + language IT
        ConfigurableText.objects.create(
            key='card.alloggio.content',
            language='it',
            content='Contenuto italiano'
        )
        
        # DEVE FALLIRE: stessa key + stessa language
        with pytest.raises(Exception):  # Django IntegrityError
            ConfigurableText.objects.create(
                key='card.alloggio.content',
                language='it',
                content='Altro contenuto italiano (duplicato)'
            )
        
        # DEVE PASSARE: stessa key ma language diversa (EN)
        text_en = ConfigurableText.objects.create(
            key='card.alloggio.content',
            language='en',
            content='English content'
        )
        assert text_en.language == 'en'
        assert ConfigurableText.objects.filter(key='card.alloggio.content').count() == 2
    
    def test_update_configurable_text(self):
        """Test updating ConfigurableText updates timestamp."""
        text = ConfigurableText.objects.create(
            key='card.viaggio.content',
            content='Original content'
        )
        original_updated_at = text.updated_at
        
        text.content = 'Updated content'
        text.save()
        text.refresh_from_db()
        
        assert text.content == 'Updated content'
        assert text.updated_at > original_updated_at


@pytest.mark.django_db
class TestConfigurableTextPublicAPI:
    """Test public read-only endpoint for ConfigurableText."""
    
    def test_public_texts_endpoint_returns_all_texts(self, api_client):
        """Test GET /api/public/texts/ returns all texts as dict."""
        ConfigurableText.objects.create(
            key='envelope.front.content',
            language='it',
            content='Front envelope HTML'
        )
        ConfigurableText.objects.create(
            key='card.alloggio.content_offered',
            language='it',
            content='Accommodation offered text'
        )
        
        url = reverse('public-texts')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, dict)
        assert 'envelope.front.content' in response.data
        assert 'card.alloggio.content_offered' in response.data
        assert response.data['envelope.front.content'] == 'Front envelope HTML'
    
    def test_public_texts_endpoint_no_auth_required(self, api_client):
        """Test public endpoint is accessible without authentication."""
        ConfigurableText.objects.create(
            key='test.key',
            content='Test content'
        )
        
        url = reverse('public-texts')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_public_texts_empty_when_no_texts(self, api_client):
        """Test endpoint returns empty dict when no texts exist."""
        url = reverse('public-texts')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data == {}


@pytest.mark.django_db
class TestConfigurableTextAdminAPI:
    """Test admin CRUD endpoints for ConfigurableText."""
    
    def test_list_configurable_texts(self, admin_client):
        """Test GET /api/admin/texts/ lists all texts."""
        ConfigurableText.objects.create(
            key='envelope.front.content',
            language='it',
            content='Front content'
        )
        ConfigurableText.objects.create(
            key='card.dresscode.content',
            language='it',
            content='Dress code content'
        )
        
        url = reverse('admin-texts-list')
        response = admin_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
    
    def test_retrieve_configurable_text_by_key(self, admin_client):
        """Test GET /api/admin/texts/<key>/ retrieves specific text."""
        text = ConfigurableText.objects.create(
            key='card.bottino.content',
            language='it',
            content='Wedding list content',
            metadata={'section': 'gifts'}
        )
        
        url = reverse('admin-texts-detail', kwargs={'key': text.key})
        response = admin_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['key'] == 'card.bottino.content'
        assert response.data['content'] == 'Wedding list content'
        assert response.data['metadata']['section'] == 'gifts'
    
    def test_create_configurable_text_via_api(self, admin_client):
        """Test POST /api/admin/texts/ creates new text."""
        url = reverse('admin-texts-list')
        payload = {
            'key': 'card.cosaltro.content',
            'language': 'it',
            'content': '<p>What else content</p>',
            'metadata': {'notes': 'Created via API'}
        }
        
        response = admin_client.post(url, payload, content_type='application/json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert ConfigurableText.objects.filter(key='card.cosaltro.content', language='it').exists()
    
    def test_update_configurable_text_via_api(self, admin_client):
        """Test PUT /api/admin/texts/<key>/ updates existing text."""
        text = ConfigurableText.objects.create(
            key='envelope.front.content',
            language='it',
            content='Original content'
        )
        
        url = reverse('admin-texts-detail', kwargs={'key': text.key})
        # NOTA: 'key' e 'language' NON vanno nel payload PUT, sono nell'URL
        payload = {
            'content': 'Updated HTML content',
            'metadata': {'updated': True}
        }
        
        response = admin_client.put(url, payload, content_type='application/json')
        
        assert response.status_code == status.HTTP_200_OK
        text.refresh_from_db()
        assert text.content == 'Updated HTML content'
        assert text.metadata['updated'] is True
    
    def test_partial_update_configurable_text_via_api(self, admin_client):
        """Test PATCH /api/admin/texts/<key>/ partially updates text."""
        text = ConfigurableText.objects.create(
            key='card.alloggio.content_not_offered',
            language='it',
            content='Original content',
            metadata={'old': 'value'}
        )
        
        url = reverse('admin-texts-detail', kwargs={'key': text.key})
        # NOTA: Solo il campo da modificare (senza 'key' o 'language')
        payload = {'content': 'Patched content only'}
        
        response = admin_client.patch(url, payload, content_type='application/json')
        
        assert response.status_code == status.HTTP_200_OK
        text.refresh_from_db()
        assert text.content == 'Patched content only'
        assert text.metadata['old'] == 'value'  # Metadata unchanged
    
    def test_delete_configurable_text_via_api(self, admin_client):
        """Test DELETE /api/admin/texts/<key>/ deletes text."""
        text = ConfigurableText.objects.create(
            key='temp.test.key',
            language='it',
            content='To be deleted'
        )
        
        url = reverse('admin-texts-detail', kwargs={'key': text.key})
        response = admin_client.delete(url)
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ConfigurableText.objects.filter(key='temp.test.key', language='it').exists()
    
    def test_search_configurable_texts(self, admin_client):
        """Test search functionality on key and content fields."""
        ConfigurableText.objects.create(
            key='card.alloggio.content_offered',
            language='it',
            content='Accommodation text'
        )
        ConfigurableText.objects.create(
            key='card.viaggio.content',
            language='it',
            content='Travel information'
        )
        ConfigurableText.objects.create(
            key='envelope.back.content',
            language='it',
            content='Back envelope text'
        )
        
        url = reverse('admin-texts-list')
        
        # Search by key
        response = admin_client.get(url, {'search': 'alloggio'})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['key'] == 'card.alloggio.content_offered'
        
        # Search by content
        response = admin_client.get(url, {'search': 'Travel'})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['key'] == 'card.viaggio.content'
