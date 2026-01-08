import pytest
from django.conf import settings
from django.core.management import call_command
from rest_framework.test import APIClient

@pytest.mark.django_db
class TestSmokeTests:
    """Smoke tests per verificare configurazione di base"""
    
    def test_database_connection(self, db):
        """Verifica che la connessione al DB PostgreSQL funzioni"""
        from django.db import connection
        assert connection.ensure_connection() is None
    
    def test_migrations_applied(self, db):
        """Verifica che tutte le migrations siano applicate"""
        from django.db.migrations.recorder import MigrationRecorder
        recorder = MigrationRecorder(None)
        applied = recorder.applied_migrations()
        assert len(applied) > 0
    
    def test_admin_site_loadable(self, admin_api_client):
        """Verifica che l'admin site sia accessibile"""
        # Note: /api/invitations/ requires auth, admin_api_client provides it
        response = admin_api_client.get('/api/invitations/')
        # Should be 200 OK because we use admin_api_client
        assert response.status_code == 200
    
    def test_public_api_loadable(self, api_client):
        """Verifica che le API pubbliche siano raggiungibili (anche se 403/401)"""
        response = api_client.post('/api/public/auth/')
        # Expect 400 (Bad Request missing fields) or 403, but not 404 or 500
        assert response.status_code != 404
        assert response.status_code != 500
    
    def test_static_files_configuration(self):
        """Verifica che STATIC_ROOT sia configurato"""
        assert hasattr(settings, 'STATIC_ROOT')
        assert settings.STATIC_ROOT is not None
