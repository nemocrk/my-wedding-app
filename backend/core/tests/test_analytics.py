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
