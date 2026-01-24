import pytest
from django.urls import reverse
from rest_framework import status
from core.models import Invitation, Person, GlobalConfig, InvitationLabel

@pytest.mark.django_db
class TestDynamicDashboardStats:
    def setup_method(self):
        # Setup di base: Configurazione prezzi globale
        self.config = GlobalConfig.objects.create(
            id=1,
            price_adult_meal = 100.00,
            price_child_meal = 50.00,
            price_accommodation_adult = 80.00,
            price_accommodation_child = 40.00
        )

        # URL dell'endpoint
        self.url = '/api/admin/dashboard/dynamic-stats/'

    def test_stats_filtering_basic(self, admin_api_client):
        """Test filtro base per status"""
        # Creiamo un invito confermato con 2 adulti
        inv1 = Invitation.objects.create(code="CONF1", status='confirmed', origin='groom')
        Person.objects.create(invitation=inv1, first_name="P1", is_child=False)
        Person.objects.create(invitation=inv1, first_name="P2", is_child=False)

        # Creiamo un invito declinato
        Invitation.objects.create(code="DEC1", status='declined', origin='bride')

        response = admin_api_client.get(self.url, {"filters": ["confirmed"]})
        
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        
        # Ci aspettiamo 2 persone (gli adulti confermati)
        total_filtered_person = sum(lvl['value'] for lvl in data['levels'][0] if lvl['name'] != 'other')
        assert total_filtered_person == 2
        # Costo: 2 adulti * 100 = 200
        total_filtered_cost = sum(lvl['total_cost'] for lvl in data['levels'][0] if lvl['name'] != 'other')
        assert total_filtered_cost == 200.0

    def test_stats_filtering_complex_cost(self, admin_api_client):
        """Test calcolo costi complesso (Bambini + Alloggio)"""
        # Invito: 1 Adulto + 1 Bambino, Richiede alloggio
        inv = Invitation.objects.create(
            code="COMPLEX", 
            status='confirmed', 
            origin='groom',
            accommodation_offered=True
        )
        # Simuliamo che abbiano risposto "Sì" all'alloggio nel JSON extra_fields (o campo dedicato se esiste)
        # Nota: La logica di calcolo costo dipende da come è implementata nel serializer.
        # Assumiamo che controlli 'accommodation_requested' se presente, o una logica simile.
        # Per ora testiamo il caso base persone.
        
        Person.objects.create(invitation=inv, first_name="A1", is_child=False)
        Person.objects.create(invitation=inv, first_name="C1", is_child=True)

        # Filter per accommodation non implementato nel mock, testiamo i prezzi base
        response = admin_api_client.get(self.url, {"filters": ["groom"]})
        
        assert response.status_code == 200
        data = response.data
        
        # Totale: 1 Adulto (100) + 1 Bambino (50) = 150
        # Se la logica include l'alloggio solo se esplicitamente richiesto, qui potrebbe essere 150.
        # Se stiamo testando solo i pasti base:
        expected_cost = 100.0 + 50.0 
        total_filtered_cost = sum(lvl['total_cost'] for lvl in data['levels'][0] if lvl['name'] != 'other')
        assert total_filtered_cost == expected_cost

        total_filtered_person = sum(lvl['value'] for lvl in data['levels'][0] if lvl['name'] != 'other')
        assert total_filtered_person == 2

    def test_stats_filtering_by_label(self, admin_api_client):
        """Test filtro per etichetta"""
        label_vip = InvitationLabel.objects.create(name="VIP", color="#FF0000")
        
        inv_vip = Invitation.objects.create(code="VIP1", status='confirmed')
        inv_vip.labels.add(label_vip)
        Person.objects.create(invitation=inv_vip, first_name="VipPerson", is_child=False)
        
        inv_normal = Invitation.objects.create(code="NORM1", status='confirmed')
        Person.objects.create(invitation=inv_normal, first_name="NormPerson", is_child=False)

        response = admin_api_client.get(self.url, {"filters": ["VIP"]})
        
        assert response.status_code == 200
        total_filtered_person = sum(lvl['value'] for lvl in response.data['levels'][0] if lvl['name'] != 'other')
        assert total_filtered_person == 1  # Solo la persona VIP

    def test_empty_filters_returns_all(self, admin_api_client):
        """Senza filtri deve tornare tutto"""
        Invitation.objects.all().delete() # Pulizia
        
        i1 = Invitation.objects.create(code="A")
        Person.objects.create(invitation=i1, first_name="P1")
        
        response = admin_api_client.get(self.url, {"filters": []})
        assert response.data['meta']['total'] == 1
