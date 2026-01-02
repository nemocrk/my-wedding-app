from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from core.models import Invitation

class InvitationAPITest(APITestCase):
    def test_create_invitation_with_guests(self):
        """
        Smoke Test: Create an invitation with nested guests.
        Reproduces the scenario that failed with 500 error.
        """
        url = reverse('invitation-list')
        data = {
            "name": "Oldani's Family",
            "code": "famiglia-oldani",
            "accommodation_offered": True,
            "transfer_offered": True,
            "guests": [
                {"first_name": "Andrea", "last_name": "Oldani", "is_child": False},
                {"first_name": "Claudia", "last_name": "", "is_child": False},
                {"first_name": "Rebecca", "last_name": "Oldani", "is_child": True}
            ],
            "affinities": [],
            "non_affinities": []
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Invitation.objects.count(), 1)
        self.assertEqual(Invitation.objects.get().guests.count(), 3)
        self.assertEqual(Invitation.objects.get().name, "Oldani's Family")

    def test_create_invitation_symmetry(self):
        """
        Test logic: If A claims affinity with B, B should have affinity with A.
        """
        # Create Invitation B first
        inv_b = Invitation.objects.create(name="Famiglia B", code="fam-b")
        
        # Create Invitation A declaring affinity with B
        url = reverse('invitation-list')
        data = {
            "name": "Famiglia A",
            "code": "fam-a",
            "guests": [{"first_name": "Mario", "last_name": "Rossi", "is_child": False}],
            "affinities": [inv_b.id]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify symmetry
        inv_b.refresh_from_db()
        inv_a_id = response.data['id']
        self.assertTrue(inv_b.affinities.filter(id=inv_a_id).exists())

    def test_list_invitations(self):
        """Smoke Test: Retrieve list of invitations"""
        Invitation.objects.create(name="Test 1", code="test-1")
        Invitation.objects.create(name="Test 2", code="test-2")
        
        url = reverse('invitation-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check pagination structure or list
        if 'results' in response.data:
            self.assertEqual(len(response.data['results']), 2)
        else:
            self.assertEqual(len(response.data), 2)
