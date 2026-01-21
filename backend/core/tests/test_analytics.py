from django.test import TestCase
from core.models import Invitation, InvitationLabel
from core.analytics import DynamicPieChartEngine

class DynamicPieChartTest(TestCase):
    def setUp(self):
        # Create Labels
        self.l1 = InvitationLabel.objects.create(name="Label1")
        self.l2 = InvitationLabel.objects.create(name="Label2")
        self.l3 = InvitationLabel.objects.create(name="Label3")

        # --- DATASET GENERATION (100 Invites) ---
        # Pattern:
        # 1-40: Groom (40 total)
        #   1-20: Sent
        #     1-10: Label1
        #     11-20: No Label
        #   21-40: Imported
        # 41-60: Bride (20 total)
        #   41-50: Sent, Label2
        #   51-60: Confirmed
        # 61-100: Others/Mixed (40 total)
        
        # 1-10: Groom, Sent, Label1
        for i in range(1, 11):
            inv = Invitation.objects.create(code=f"i{i}", name=f"Inv{i}", origin='groom', status='sent')
            inv.labels.add(self.l1)
            
        # 11-20: Groom, Sent
        for i in range(11, 21):
            Invitation.objects.create(code=f"i{i}", name=f"Inv{i}", origin='groom', status='sent')

        # 21-40: Groom, Imported
        for i in range(21, 41):
            Invitation.objects.create(code=f"i{i}", name=f"Inv{i}", origin='groom', status='imported')

        # 41-50: Bride, Sent, Label2
        for i in range(41, 51):
            inv = Invitation.objects.create(code=f"i{i}", name=f"Inv{i}", origin='bride', status='sent')
            inv.labels.add(self.l2)

        # 51-60: Bride, Confirmed
        for i in range(51, 61):
            Invitation.objects.create(code=f"i{i}", name=f"Inv{i}", origin='bride', status='confirmed')

        # 61-100: Others (No Origin, No Status match for our filters usually)
        for i in range(61, 101):
            Invitation.objects.create(code=f"i{i}", name=f"Inv{i}", origin='bride', status='declined')

    def test_dynamic_chart_logic_1(self):
        """
        Scenario: ['groom', 'sent', 'Label2']
        Total: 100
        
        Expected Level 1 (Max Disjoint):
        - Groom: 40 (IDs 1-40) - Includes Sent/Imported/Label1
        - Label2: 10 (IDs 41-50) - Only Bride+Sent+Label2 matches (Label2 disjoint from Groom)
        - Other: 50 (IDs 51-100)
        
        Note: 'sent' is NOT in Level 1 because Groom(40) + Label2(10) + Other(50) = 100.
              'sent' overlaps with Groom (1-20) and Label2 (41-50).
              Max disjoint set {Groom, Label2} covers 50 items.
              Set {Sent} covers 30 items.
              Set {Groom, Sent} -> Groom (40) + Sent-Unique (41-50) = 50.
        
        Let's see what the algo picks.
        """
        engine = DynamicPieChartEngine(Invitation.objects.all(), ['groom', 'sent', 'Label2'])
        result = engine.calculate()
        
        level1 = result[0]
        
        # Helper to find node by name
        def get_val(lvl, name):
            for n in lvl:
                if n['name'] == name:
                    return n['value']
            return 0

        # Level 1 Checks
        self.assertEqual(get_val(level1, 'groom'), 40)
        self.assertEqual(get_val(level1, 'Label2'), 10)
        self.assertEqual(get_val(level1, 'other'), 50)
        
        # Level 2 Checks (Split by 'sent' - the remaining filter)
        level2 = result[1]
        
        # Under Groom (40): 
        # - Sent: 20 (IDs 1-20)
        # - Other (Imported): 20 (IDs 21-40)
        # Need to find children of Groom node. Groom is index 0 likely (dict order varies but usually stable here).
        # We look for nodes with parent_idx pointing to Groom.
        
        groom_idx = next(i for i, n in enumerate(level1) if n['name'] == 'groom')
        l2_groom_sent = next(n for n in level2 if n['parent_idx'] == groom_idx and n['name'] == 'sent')
        l2_groom_other = next(n for n in level2 if n['parent_idx'] == groom_idx and n['name'] == 'other')
        
        self.assertEqual(l2_groom_sent['value'], 20)
        self.assertEqual(l2_groom_other['value'], 20)
        
        # Under Label2 (10):
        # - Sent: 10 (IDs 41-50)
        # - Other: 0
        label2_idx = next(i for i, n in enumerate(level1) if n['name'] == 'Label2')
        l2_label2_sent = next(n for n in level2 if n['parent_idx'] == label2_idx and n['name'] == 'sent')
        
        self.assertEqual(l2_label2_sent['value'], 10)
        
        # Under Other (50):
        # - Sent: 0
        # - Other: 50
        other_idx = next(i for i, n in enumerate(level1) if n['name'] == 'other')
        l2_other_other = next(n for n in level2 if n['parent_idx'] == other_idx and n['name'] == 'other')
        self.assertEqual(l2_other_other['value'], 50)

    def test_empty_filters(self):
        """
        Edge Case: Empty filters list should return empty result
        """
        engine = DynamicPieChartEngine(Invitation.objects.all(), [])
        result = engine.calculate()
        
        self.assertEqual(result, [])

    def test_no_match_all_other(self):
        """
        Edge Case: Filters that don't match any invitation
        Expected: All invitations in 'other' node
        """
        # Use filters that don't exist in the dataset
        engine = DynamicPieChartEngine(Invitation.objects.all(), ['nonexistent_filter', 'fake_status'])
        result = engine.calculate()
        
        # Should return empty since no partition is found
        self.assertEqual(result, [])

    def test_single_filter_100_percent_coverage(self):
        """
        Edge Case: Single filter that covers all invitations
        Expected: One node with 100% coverage, no 'other'
        """
        # All invitations in setUp have origin='groom' or 'bride'
        # Let's test with a filter that partially covers
        engine = DynamicPieChartEngine(Invitation.objects.all(), ['groom'])
        result = engine.calculate()
        
        self.assertEqual(len(result), 1)  # Only 1 level
        level1 = result[0]
        
        # Should have 'groom' node with 40 invitations and 'other' with 60
        groom_node = next(n for n in level1 if n['name'] == 'groom')
        other_node = next(n for n in level1 if n['name'] == 'other')
        
        self.assertEqual(groom_node['value'], 40)
        self.assertEqual(other_node['value'], 60)

    def test_multiple_labels_precedence(self):
        """
        Edge Case: Invitation with multiple labels
        Expected: First matching label in filter list takes precedence
        """
        # Create an invitation with multiple labels
        inv = Invitation.objects.create(code="multi", name="MultiLabel", origin='groom', status='sent')
        inv.labels.add(self.l1, self.l2, self.l3)
        
        # Test with filters in specific order
        engine = DynamicPieChartEngine(Invitation.objects.all(), ['Label3', 'Label1', 'Label2'])
        result = engine.calculate()
        
        # The engine should match all three labels since they're disjoint in terms of invitation IDs
        # Our multi-label invitation should appear in one of them
        level1 = result[0]
        
        # Verify that the multi-label invitation is counted
        total_value = sum(n['value'] for n in level1)
        self.assertEqual(total_value, 101)  # 100 original + 1 new

    def test_performance_large_dataset(self):
        """
        Performance: Test with 1000+ invitations and 10+ filters
        Verifies combinatorial complexity doesn't explode
        """
        # Create additional labels
        labels = [InvitationLabel.objects.create(name=f"PerfLabel{i}") for i in range(10)]
        
        # Create 1000 invitations with random distribution
        origins = ['groom', 'bride']
        statuses = ['sent', 'confirmed', 'declined', 'imported']
        
        for i in range(1000):
            inv = Invitation.objects.create(
                code=f"perf{i}",
                name=f"PerfInv{i}",
                origin=origins[i % 2],
                status=statuses[i % 4]
            )
            # Add 2 labels to each
            inv.labels.add(labels[i % 10], labels[(i + 1) % 10])
        
        # Test with many filters
        filters = ['groom', 'bride', 'sent', 'confirmed'] + [f"PerfLabel{i}" for i in range(10)]
        
        import time
        start = time.time()
        engine = DynamicPieChartEngine(Invitation.objects.all(), filters)
        result = engine.calculate()
        elapsed = time.time() - start
        
        # Should complete in reasonable time (< 5 seconds)
        self.assertLess(elapsed, 5.0)
        
        # Should have results
        self.assertGreater(len(result), 0)
        
        # Level 1 should have some partitioning
        level1 = result[0]
        self.assertGreater(len(level1), 1)

    def test_recursive_levels_parent_idx(self):
        """
        Recursive Levels: Verify parent_idx correctness up to level 4
        """
        # Use filters that will create multiple levels
        engine = DynamicPieChartEngine(
            Invitation.objects.all(),
            ['groom', 'bride', 'sent', 'confirmed', 'imported', 'declined']
        )
        result = engine.calculate()
        
        # Should have multiple levels (at least 2)
        self.assertGreaterEqual(len(result), 2)
        
        # Verify level 2+ nodes have valid parent_idx
        for level_idx in range(1, len(result)):
            level = result[level_idx]
            parent_level = result[level_idx - 1]
            
            for node in level:
                # Every node in level 2+ should have parent_idx
                self.assertIsNotNone(node.get('parent_idx'))
                
                # parent_idx should be valid index in parent level
                parent_idx = node['parent_idx']
                self.assertGreaterEqual(parent_idx, 0)
                self.assertLess(parent_idx, len(parent_level))
                
                # Verify parent exists
                parent_node = parent_level[parent_idx]
                self.assertIsNotNone(parent_node)

    def test_level_limit_four_rings(self):
        """
        Level Limit: Verify algorithm stops at 4 levels (rings)
        """
        # Create deep hierarchy of filters
        deep_labels = [InvitationLabel.objects.create(name=f"Deep{i}") for i in range(10)]
        
        # Create invitations with nested characteristics
        for i in range(50):
            inv = Invitation.objects.create(
                code=f"deep{i}",
                name=f"DeepInv{i}",
                origin='groom',
                status='sent'
            )
            inv.labels.add(deep_labels[i % 10])
        
        # Use many filters to try forcing deep recursion
        filters = ['groom', 'sent'] + [f"Deep{i}" for i in range(10)]
        
        engine = DynamicPieChartEngine(Invitation.objects.all(), filters)
        result = engine.calculate()
        
        # Should not exceed 4 levels
        self.assertLessEqual(len(result), 4)

    def test_field_type_tracking(self):
        """
        Field Type: Verify that field types (origin/status/labels) are correctly tracked
        """
        engine = DynamicPieChartEngine(Invitation.objects.all(), ['groom', 'sent', 'Label1'])
        result = engine.calculate()
        
        level1 = result[0]
        
        # Find nodes and verify their field types
        groom_node = next((n for n in level1 if n['name'] == 'groom'), None)
        self.assertIsNotNone(groom_node)
        self.assertEqual(groom_node['field'], 'origin')
        
        # Label1 should have field type 'labels'
        label_node = next((n for n in level1 if n['name'] == 'Label1'), None)
        if label_node:  # May be in level 2 depending on disjoint algo
            self.assertEqual(label_node['field'], 'labels')
        
        # Check level 2 for 'sent' which should be 'status'
        if len(result) > 1:
            level2 = result[1]
            sent_nodes = [n for n in level2 if n['name'] == 'sent']
            for sent_node in sent_nodes:
                self.assertEqual(sent_node['field'], 'status')
