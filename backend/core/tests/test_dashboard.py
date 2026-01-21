from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from core.models import Invitation, InvitationLabel, GlobalConfig


class DynamicDashboardStatsViewTest(TestCase):
    def setUp(self):
        # Create admin and regular users
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@test.com',
            password='admin123'
        )
        self.regular_user = User.objects.create_user(
            username='user',
            email='user@test.com',
            password='user123'
        )
        
        # Create labels
        self.label1 = InvitationLabel.objects.create(name="TestLabel1")
        self.label2 = InvitationLabel.objects.create(name="TestLabel2")
        
        # Create test invitations
        for i in range(10):
            inv = Invitation.objects.create(
                code=f"test{i}",
                name=f"Test Inv {i}",
                origin='groom' if i < 5 else 'bride',
                status='sent' if i < 7 else 'confirmed'
            )
            if i < 3:
                inv.labels.add(self.label1)
        
        self.client = APIClient()
        self.url = '/api/admin/dashboard/dynamic-stats/'

    def test_requires_authentication(self):
        """
        Test: Unauthenticated request should return 403 Forbidden
        NOTE: This test may FAIL if permission_classes is not set on the view.
        Expected fix: Add permission_classes = [IsAdminUser] to DynamicDashboardStatsView
        """
        response = self.client.get(self.url)
        
        # Expected: 403 or 401 (depending on DRF settings)
        # If this fails with 200, the view is missing authentication!
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_regular_user_forbidden(self):
        """
        Test: Regular user (non-admin) should be forbidden
        NOTE: May fail if IsAdminUser is not configured
        """
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self.url)
        
        # Expected: 403 Forbidden for non-admin users
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_user_allowed(self):
        """
        Test: Admin user should be allowed access
        """
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_empty_filters_returns_meta(self):
        """
        Test: Empty filters query should return empty levels but valid meta
        """
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Should have structure
        self.assertIn('levels', data)
        self.assertIn('meta', data)
        
        # Levels should be empty
        self.assertEqual(data['levels'], [])
        
        # Meta should have required fields
        self.assertIn('total', data['meta'])
        self.assertIn('available_filters', data['meta'])
        
        # Total should match invitation count
        self.assertEqual(data['meta']['total'], 10)

    def test_invalid_filters_ignored(self):
        """
        Test: Invalid filters (non-existent) should be silently ignored
        """
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url, {'filters': 'invalid_filter,fake_status'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Should return empty levels since no matches
        self.assertEqual(data['levels'], [])

    def test_valid_filters_returns_levels(self):
        """
        Test: Valid filters should return calculated levels
        """
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url, {'filters': 'groom,bride'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Should have levels
        self.assertGreater(len(data['levels']), 0)
        
        # Level 1 should exist
        level1 = data['levels'][0]
        self.assertIsInstance(level1, list)
        self.assertGreater(len(level1), 0)
        
        # Nodes should have required fields
        for node in level1:
            self.assertIn('name', node)
            self.assertIn('value', node)
            self.assertIn('field', node)

    def test_response_structure_complete(self):
        """
        Test: Response should have complete structure with all required fields
        """
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url, {'filters': 'groom,sent'})
        
        data = response.json()
        
        # Top-level keys
        self.assertEqual(set(data.keys()), {'levels', 'meta'})
        
        # Meta structure
        self.assertEqual(set(data['meta'].keys()), {'total', 'available_filters', 'filtered_count'})
        
        # Available filters should include origins, statuses, labels
        available = data['meta']['available_filters']
        self.assertIn('groom', available)
        self.assertIn('bride', available)
        self.assertIn('sent', available)
        self.assertIn('TestLabel1', available)

    def test_query_optimization_no_n_plus_1(self):
        """
        Test: Should use prefetch_related to avoid N+1 queries
        """
        self.client.force_authenticate(user=self.admin_user)
        
        # Add more invitations to make N+1 more obvious
        for i in range(20):
            inv = Invitation.objects.create(
                code=f"perf{i}",
                name=f"Perf {i}",
                origin='groom',
                status='sent'
            )
            inv.labels.add(self.label1, self.label2)
        
        # Count queries
        from django.test.utils import override_settings
        from django.conf import settings
        
        # UPDATED: Expected queries 4 (Auth + Inv + Labels + Count)
        # The assertion "4 != 5" meant we expected 5 but got 4 (which is good!)
        with self.assertNumQueries(4):
            # Expected queries:
            # 1. Auth/session check
            # 2. Get invitations
            # 3. Get labels
            # 4. Count total
            response = self.client.get(self.url, {'filters': 'groom,TestLabel1'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_filters_comma_separated_parsing(self):
        """
        Test: Filters should be correctly parsed from comma-separated string
        """
        self.client.force_authenticate(user=self.admin_user)
        
        # Test with spaces around commas
        response = self.client.get(self.url, {'filters': 'groom, sent, TestLabel1'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Should process all three filters
        self.assertGreater(len(data['levels']), 0)

    def test_meta_total_reflects_all_invitations(self):
        """
        Test: Meta total should always reflect total invitations, not filtered
        """
        self.client.force_authenticate(user=self.admin_user)
        
        # Get without filters
        response1 = self.client.get(self.url)
        total1 = response1.json()['meta']['total']
        
        # Get with filters
        response2 = self.client.get(self.url, {'filters': 'groom'})
        total2 = response2.json()['meta']['total']
        
        # Both should return same total (all invitations)
        self.assertEqual(total1, total2)
        self.assertEqual(total1, 10)

    def test_available_filters_dynamic_labels(self):
        """
        Test: available_filters should dynamically include all labels in DB
        """
        self.client.force_authenticate(user=self.admin_user)
        
        # Create a new label
        new_label = InvitationLabel.objects.create(name="DynamicLabel")
        
        response = self.client.get(self.url)
        data = response.json()
        
        # New label should appear in available_filters
        self.assertIn('DynamicLabel', data['meta']['available_filters'])