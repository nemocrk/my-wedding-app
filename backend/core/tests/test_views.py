import pytest
from rest_framework.test import APIClient
from rest_framework import status
from core.models import Invitation, GlobalConfig, Person, Accommodation, Room

@pytest.mark.django_db
class TestPublicInvitationAuthView:
    def setup_method(self):
        self.client = APIClient()
        self.config = GlobalConfig.objects.create(invitation_link_secret="secret")
        self.invitation = Invitation.objects.create(
            name="Test Fam", code="TEST01", status=Invitation.Status.SENT
        )
        self.token = self.invitation.generate_verification_token("secret")

    def test_auth_success(self):
        url = '/api/public/invitation/auth/'
        data = {'code': 'TEST01', 'token': self.token}
        response = self.client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['valid'] is True
        assert self.client.session['invitation_id'] == self.invitation.id

    def test_auth_invalid_token(self):
        url = '/api/public/invitation/auth/'
        data = {'code': 'TEST01', 'token': 'wrong'}
        response = self.client.post(url, data)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_auth_not_found(self):
        url = '/api/public/invitation/auth/'
        data = {'code': 'UNKNOWN', 'token': 'whatever'}
        response = self.client.post(url, data)
        assert response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.django_db
class TestPublicRSVPView:
    def setup_method(self):
        self.client = APIClient()
        self.invitation = Invitation.objects.create(
            name="RSVP Family", code="RSVP01", status=Invitation.Status.SENT
        )
        self.p1 = Person.objects.create(invitation=self.invitation, first_name="Mario", last_name="Rossi")
        self.p2 = Person.objects.create(invitation=self.invitation, first_name="Luigi", last_name="Verdi")
        
        # Simulate login
        session = self.client.session
        session['invitation_id'] = self.invitation.id
        session.save()

    def test_rsvp_confirm_updates(self):
        url = '/api/public/rsvp/'
        data = {
            'status': 'confirmed',
            'phone_number': '3331234567',
            'guest_updates': {
                '0': {'first_name': 'Mario Updated', 'dietary_requirements': 'Vegan'}
            },
            'excluded_guests': [1], # Index 1 is Luigi (p2)
            'travel_info': {
                'transport_type': 'aereo',
                'schedule': 'Flight AZ123'
            }
        }
        
        response = self.client.post(url, data, format='json')
        assert response.status_code == status.HTTP_200_OK
        
        self.invitation.refresh_from_db()
        self.p1.refresh_from_db()
        self.p2.refresh_from_db()

        assert self.invitation.status == 'confirmed'
        assert self.invitation.phone_number == '3331234567'
        assert self.invitation.travel_transport_type == 'aereo'
        
        assert self.p1.first_name == 'Mario Updated'
        assert self.p1.dietary_requirements == 'Vegan'
        
        assert self.p2.not_coming is True

@pytest.mark.django_db
class TestDashboardStatsView:
    def setup_method(self):
        self.client = APIClient()
        self.config = GlobalConfig.objects.create(
            price_adult_meal=100, price_child_meal=50,
            price_accommodation_adult=80, price_accommodation_child=40,
            price_transfer=20
        )
        # Create unique codes for invitations
        inv1 = Invitation.objects.create(
            name="Conf", code="CONF01", 
            status=Invitation.Status.CONFIRMED, accommodation_requested=True
        )
        Person.objects.create(invitation=inv1, is_child=False) # 1 Adult
        
        inv2 = Invitation.objects.create(
            name="Pend", code="PEND01",
            status=Invitation.Status.SENT
        )
        Person.objects.create(invitation=inv2, is_child=True) # 1 Child

    def test_get_stats(self):
        url = '/api/admin/dashboard/stats/'
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.data
        assert data['guests']['adults_confirmed'] == 1
        assert data['guests']['children_pending'] == 1
        assert data['financials']['confirmed'] > 0

@pytest.mark.django_db
class TestAccommodationAutoAssign:
    def setup_method(self):
        self.client = APIClient()
        self.acc = Accommodation.objects.create(name="Hotel A", address="Via Roma")
        self.room = Room.objects.create(accommodation=self.acc, room_number="101", capacity_adults=2, capacity_children=0)
        
        self.inv = Invitation.objects.create(
            name="Couple", code="COUPLE01",
            status=Invitation.Status.CONFIRMED, 
            accommodation_requested=True
        )
        self.p1 = Person.objects.create(invitation=self.inv, first_name="A")
        self.p2 = Person.objects.create(invitation=self.inv, first_name="B")

    def test_auto_assign_simulation(self):
        url = '/api/admin/accommodation/auto-assign/'
        data = {'strategy': 'SIMULATION', 'reset_previous': False}
        
        response = self.client.post(url, data, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['mode'] == 'SIMULATION'
        assert len(response.data['results']) > 0

    def test_auto_assign_execution(self):
        url = '/api/admin/accommodation/auto-assign/'
        data = {'strategy': 'STANDARD', 'reset_previous': True}
        
        response = self.client.post(url, data, format='json')
        assert response.status_code == status.HTTP_200_OK
        
        result = response.data['result']
        assert result['assigned_guests'] == 2
        
        self.p1.refresh_from_db()
        assert self.p1.assigned_room == self.room
