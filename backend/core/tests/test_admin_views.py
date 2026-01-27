from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from core.models import (
    Invitation, GlobalConfig, Person, Accommodation, Room, 
    GuestInteraction, GuestHeatmap, WhatsAppTemplate, 
    ConfigurableText, InvitationLabel, WhatsAppMessageQueue
)
from core.views import AccommodationViewSet
import json
from unittest.mock import patch, MagicMock

class AdminViewsTest(TestCase):
    def setUp(self):
        # Admin User
        self.user = User.objects.create_superuser('admin', 'admin@test.com', 'password')
        self.client = Client()
        self.client.force_login(self.user)
        
        # Config
        self.config = GlobalConfig.objects.create(
            invitation_link_secret='secret',
            price_adult_meal=100.0,
            price_child_meal=50.0,
            price_accommodation_adult=80.0,
            price_accommodation_child=40.0,
            price_transfer=20.0
        )

    # --- PUBLIC VIEWS ---

    def test_public_languages(self):
        response = self.client.get('/api/public/languages/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.json()) > 0)

    def test_public_configurable_texts(self):
        ConfigurableText.objects.create(key='welcome', content='Benvenuto', language='it')
        ConfigurableText.objects.create(key='welcome', content='Welcome', language='en')
        
        # Default (it)
        res_it = self.client.get('/api/public/texts/')
        self.assertEqual(res_it.json().get('welcome'), 'Benvenuto')
        
        # English
        res_en = self.client.get('/api/public/texts/?lang=en')
        self.assertEqual(res_en.json().get('welcome'), 'Welcome')

    # --- DASHBOARD & STATS ---

    def test_dashboard_stats(self):
        # Setup Data
        inv = Invitation.objects.create(status=Invitation.Status.CONFIRMED, accommodation_requested=True, transfer_requested=True)
        Person.objects.create(invitation=inv, first_name="Adult", is_child=False)
        Person.objects.create(invitation=inv, first_name="Child", is_child=True)
        
        # Declined
        inv_decl = Invitation.objects.create(status=Invitation.Status.DECLINED)
        Person.objects.create(invitation=inv_decl, first_name="Declined")

        response = self.client.get('/api/dashboard/stats/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Guests
        self.assertEqual(data['guests']['adults_confirmed'], 1)
        self.assertEqual(data['guests']['children_confirmed'], 1)
        self.assertEqual(data['guests']['adults_declined'], 1)
        
        # Logistics
        self.assertEqual(data['logistics']['accommodation']['confirmed_adults'], 1)
        
        # Financials (100 + 50 + 80 + 40 + 2*20 = 310)
        expected_cost = 100 + 50 + 80 + 40 + 40
        self.assertEqual(data['financials']['confirmed'], expected_cost)

    # --- INVITATION ACTIONS ---

    def test_invitation_bulk_actions(self):
        inv1 = Invitation.objects.create(name="Inv1", status=Invitation.Status.CREATED)
        inv2 = Invitation.objects.create(name="Inv2", status=Invitation.Status.CREATED)
        
        # Bulk Send
        res_send = self.client.post('/api/invitations/bulk-send/', 
                                  data=json.dumps({'invitation_ids': [inv1.id, inv2.id]}), 
                                  content_type='application/json')
        self.assertEqual(res_send.status_code, 200)
        inv1.refresh_from_db()
        self.assertEqual(inv1.status, Invitation.Status.SENT)
        
        # Bulk Labels
        label = InvitationLabel.objects.create(name="VIP", color="#000000")
        res_label = self.client.post('/api/invitations/bulk-labels/',
                                   data=json.dumps({
                                       'invitation_ids': [inv1.id, inv2.id],
                                       'label_ids': [label.id],
                                       'action': 'add'
                                   }),
                                   content_type='application/json')
        self.assertEqual(res_label.status_code, 200)
        self.assertTrue(inv1.labels.filter(id=label.id).exists())

    def test_mark_as_read_idempotency(self):
        inv = Invitation.objects.create(name="InvRead", status=Invitation.Status.SENT)
        
        # First call: Sent -> Read
        res1 = self.client.post(f'/api/invitations/{inv.id}/mark-as-read/')
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.json()['status'], 'read')
        
        # Second call: Already Read -> No change
        res2 = self.client.post(f'/api/invitations/{inv.id}/mark-as-read/')
        self.assertEqual(res2.json()['transition'], 'none')

    def test_heatmaps_and_interactions(self):
        inv = Invitation.objects.create(name="Analytics")
        GuestHeatmap.objects.create(invitation=inv, session_id="s1", mouse_data=[])
        GuestInteraction.objects.create(invitation=inv, event_type="visit", ip_address="127.0.0.1")
        
        res_hm = self.client.get(f'/api/invitations/{inv.id}/heatmaps/')
        self.assertEqual(res_hm.status_code, 200)
        self.assertEqual(len(res_hm.json()), 1)
        
        res_int = self.client.get(f'/api/invitations/{inv.id}/interactions/')
        self.assertEqual(res_int.status_code, 200)

    # --- ACCOMMODATION LOGIC ---

    def test_accommodation_auto_assign(self):
        # Setup
        acc = Accommodation.objects.create(name="Hotel")
        room = Room.objects.create(accommodation=acc, name="101", capacity=2)
        
        inv = Invitation.objects.create(status=Invitation.Status.CONFIRMED, accommodation_requested=True)
        p1 = Person.objects.create(invitation=inv, first_name="G1", is_child=False)
        p2 = Person.objects.create(invitation=inv, first_name="G2", is_child=False)
        
        # Unassigned check
        res_unassigned = self.client.get('/api/accommodations/unassigned-invitations/')
        self.assertEqual(len(res_unassigned.json()), 1)
        
        # Auto Assign Simulation
        res_sim = self.client.post('/api/accommodations/auto-assign/',
                                 data=json.dumps({'strategy': 'SIMULATION', 'reset_previous': True}),
                                 content_type='application/json')
        self.assertEqual(res_sim.status_code, 200)
        self.assertEqual(res_sim.json()['mode'], 'SIMULATION')
        
        # Execution
        res_exec = self.client.post('/api/accommodations/auto-assign/',
                                  data=json.dumps({'strategy': 'STANDARD', 'reset_previous': True}),
                                  content_type='application/json')
        self.assertEqual(res_exec.status_code, 200)
        
        # Verify Assignment
        p1.refresh_from_db()
        self.assertEqual(p1.assigned_room, room)

    # --- SIGNALS ---

    def test_signal_dietary_label(self):
        inv = Invitation.objects.create(name="Dietary")
        p = Person.objects.create(invitation=inv, first_name="Allergic")
        
        # Update dietary -> Trigger signal
        p.dietary_requirements = "Gluten Free"
        p.save()
        
        self.assertTrue(inv.labels.filter(name="Intolleranze").exists())
        
        # Clear -> Remove label
        p.dietary_requirements = ""
        p.save()
        
        self.assertFalse(inv.labels.filter(name="Intolleranze").exists())

    def test_signal_whatsapp_status_change(self):
        # Create Template
        WhatsAppTemplate.objects.create(
            name="SentTpl",
            content="Hello {name}",
            condition=WhatsAppTemplate.Condition.STATUS_CHANGE,
            trigger_status=Invitation.Status.SENT,
            is_active=True
        )
        
        inv = Invitation.objects.create(name="Whatsapp", phone_number="1234567890", status=Invitation.Status.CREATED)
        
        # Change Status -> Trigger Signal
        inv.status = Invitation.Status.SENT
        inv.save()
        
        # Check Queue
        self.assertTrue(WhatsAppMessageQueue.objects.filter(recipient_number="1234567890").exists())

    # --- GOOGLE FONTS PROXY ---
    
    @patch('builtins.open')
    @patch('os.path.exists')
    def test_google_fonts_proxy(self, mock_exists, mock_open):
        mock_exists.return_value = True
        mock_file = MagicMock()
        mock_file.__enter__.return_value = mock_file
        mock_file.read.return_value = json.dumps([{"name": "Roboto", "category": "sans-serif"}])
        mock_open.return_value = mock_file
        
        response = self.client.get('/api/admin/fonts/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['items'][0]['family'], 'Roboto')
