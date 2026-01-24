from collections import defaultdict
from itertools import combinations
from core.models import Person, GlobalConfig

class DynamicPieChartEngine:
    def __init__(self, queryset, selected_filters):
        # queryset here is Invitation queryset
        self.invitations_queryset = queryset
        self.selected_filters = set(selected_filters)
        self.cache_matches = {} 
        self.cost_map = {} # person_id -> cost_data

    def _preload_data(self):
        # Fetch persons excluding not_coming
        persons = Person.objects.filter(
            invitation__in=self.invitations_queryset, 
            not_coming=False
        ).select_related('invitation').prefetch_related('invitation__labels')

        # Load Global Config for costs
        config = GlobalConfig.objects.first()
        # Default prices if config missing (fallback)
        price_adult = float(config.price_adult_meal) if config else 0.0
        price_child = float(config.price_child_meal) if config else 0.0
        price_acc_adult = float(config.price_accommodation_adult) if config else 0.0
        price_acc_child = float(config.price_accommodation_child) if config else 0.0
        price_transfer = float(config.price_transfer) if config else 0.0

        for person in persons:
            inv = person.invitation
            matches = []
            
            # --- Standard Filters ---
            if inv.origin in self.selected_filters:
                matches.append({ 'value': inv.origin, 'field': 'origin' })
            if inv.status in self.selected_filters:
                matches.append({ 'value': inv.status, 'field': 'status' })
            
            # Label optimization
            inv_label_names = set(l.name for l in inv.labels.all())
            common_labels = inv_label_names.intersection(self.selected_filters)
            if common_labels:
                matches.extend({'value': label, 'field': 'labels'} for label in common_labels)
            
            # --- New Dichotomous Filters ---
            
            # Adults / Children
            is_child_val = 'children' if person.is_child else 'adults'
            if is_child_val in self.selected_filters:
                matches.append({ 'value': is_child_val, 'field': 'is_child' })
            
            # Accommodation Offered
            acc_offered_val = 'accommodation_offered' if inv.accommodation_offered else 'accommodation_not_offered'
            if acc_offered_val in self.selected_filters:
                matches.append({ 'value': acc_offered_val, 'field': 'accommodation_offered' })

            # Accommodation Requested
            acc_req_val = 'accommodation_requested' if inv.accommodation_requested else 'accommodation_not_requested'
            if acc_req_val in self.selected_filters:
                matches.append({ 'value': acc_req_val, 'field': 'accommodation_requested' })

            self.cache_matches[person.id] = matches
            
            # --- Precalc Single Person Cost ---
            p_cost = price_child if person.is_child else price_adult
            
            if inv.accommodation_requested:
                p_cost += price_acc_child if person.is_child else price_acc_adult
            
            if inv.transfer_requested:
                p_cost += price_transfer
                
            self.cost_map[person.id] = p_cost

    def _check_match(self, person_id, filter_value):
        matches = self.cache_matches.get(person_id, [])
        return any(m['value'] == filter_value for m in matches)

    def _get_max_disjoint_subset(self, candidate_filters, subset_person_ids):
        if not candidate_filters:
            return {}, list(subset_person_ids), []

        grouped_data = defaultdict(list)
        candidate_filters_set = set(candidate_filters)

        for person_id in subset_person_ids:
            matches = self.cache_matches.get(person_id, [])
            for m in matches:
                f_val = m['value']
                if f_val in candidate_filters_set:
                    grouped_data[(f_val, m['field'])].append(person_id)

        filter_coverage = [
            {"filter": f, "field": field, "ids": p_ids}
            for (f, field), p_ids in grouped_data.items()
        ]
        
        filter_ids_lookup = {item["filter"]: item["ids"] for item in filter_coverage}
        filter_fields_lookup = {item["filter"]: item["field"] for item in filter_coverage}
        active_filters = list(filter_ids_lookup.keys())

        if not active_filters:
            return {}, list(subset_person_ids), candidate_filters

        best_combination = []
        best_coverage_count = -1
        best_fields_count = 9999
        
        # Limitiamo la complessità combinatoria
        max_r = min(len(active_filters), 5) 
        
        for r in range(1, max_r + 1):
            for combo in combinations(active_filters, r):
                current_combo_coverage = set()
                current_combo_fields = set()
                is_disjoint = True
                
                # Check veloce di disgiunzione
                for f in combo:
                    ids = filter_ids_lookup[f]
                    # Se c'è intersezione, il set non è disgiunto
                    if not current_combo_coverage.isdisjoint(ids):
                        is_disjoint = False
                        break
                    current_combo_fields.add(filter_fields_lookup[f])
                    current_combo_coverage.update(ids)
                
                if is_disjoint:
                    cov_len = len(current_combo_coverage)
                    fields_len = len(current_combo_fields)
                    
                    if cov_len > best_coverage_count or (cov_len == best_coverage_count and fields_len < best_fields_count):
                        best_coverage_count = cov_len
                        best_fields_count = fields_len
                        best_combination = combo
        
        partition = {}
        covered_ids = set()
        for f in best_combination:
            ids = filter_ids_lookup[f]
            partition[f] = { "ids": list(ids), "field": filter_fields_lookup[f] }
            covered_ids.update(ids)
            
        remaining_ids = [i for i in subset_person_ids if i not in covered_ids]
        
        # Ritorna i filtri che NON sono stati usati in questa partizione
        used_in_partition = set(partition.keys())
        remaining_filters = [f for f in active_filters if f not in used_in_partition]

        return partition, remaining_ids, remaining_filters

    def calculate(self):
        self._preload_data()
        
        all_ids = list(self.cache_matches.keys())
        remaining_filters = list(self.selected_filters)
        
        levels_data = []
        
        # --- LEVEL 1: Max Disjoint Partition ---
        partition, other_ids, remaining_filters = self._get_max_disjoint_subset(remaining_filters, all_ids)

        if not partition and not other_ids:
            return []
        
        l1_nodes = []
        for filter_key, data in partition.items():
            l1_nodes.append({
                "name": filter_key,
                "field": data['field'],
                "value": len(data['ids']),
                "ids": data['ids'],
                "parent": None
            })
        
        if other_ids:
            l1_nodes.append({
                "name": "other",
                "field": "other",
                "value": len(other_ids),
                "ids": other_ids,
                "parent": None
            })
            
        levels_data.append(l1_nodes)
                
        # --- LEVEL 2+ ---
        current_level_nodes = l1_nodes
        
        # Continua finché ci sono filtri e non superiamo i 4 livelli (anelli)
        while remaining_filters and len(levels_data) < 4:
                                    
            partition, other_ids, remaining_filters = self._get_max_disjoint_subset(remaining_filters, all_ids)
            
            next_level_nodes = []
            
            for node in current_level_nodes:
                parent_ids = node["ids"]
                if not parent_ids:
                    continue
                    
                match_ids = []
                # No need to track no_match_ids explicitly here, we derive it
                
                for pid in parent_ids:
                    for filter_key, data in partition.items():
                        if pid in data["ids"]:
                            if self._check_match(pid, filter_key):
                                match_ids.append({"filter": filter_key, "data": data, "pid": pid})
                
                # 1. Estrai gli ID che hanno trovato un match
                matched_pids = {m["pid"] for m in match_ids}

                # 2. Sottrai i matched_pids dal set totale dei parent_ids
                no_match_ids = list(set(parent_ids) - matched_pids)
                
                # --- NODO MATCH (Ha il filtro) ---
                if match_ids:
                    grouped_map = defaultdict(lambda: {"value": 0, "ids": []})

                    for match_item in match_ids:
                        group_key = (
                            match_item["filter"],            # name
                            match_item["data"]["field"],     # field
                            node["name"],                  # parent
                            current_level_nodes.index(node) # parent_idx
                        )
                        
                        grouped_map[group_key]["value"] += 1
                        grouped_map[group_key]["ids"].append(match_item["pid"])

                    for (name, field, parent, p_idx), data in grouped_map.items():
                        next_level_nodes.append({
                            "name": name,
                            "field": field,
                            "value": data["value"],
                            "ids": data["ids"],
                            "parent": parent,
                            "parent_idx": p_idx
                        })
                
                # --- NODO NO-MATCH (Rimanenza) ---
                if no_match_ids:
                    next_level_nodes.append({
                        "name": "other",
                        "field": "other",
                        "value": len(no_match_ids),
                        "ids": no_match_ids,
                        "parent": node["name"],
                        "parent_idx": current_level_nodes.index(node)
                    })

            if next_level_nodes:
                levels_data.append(next_level_nodes)
                current_level_nodes = next_level_nodes
            else:
                break
                
        # Pulizia finale e Calcolo Costi
        final_output = []
        for level in levels_data:
            clean_level = []
            for node in level:
                # Calculate total cost for this node
                node_cost = sum(self.cost_map.get(pid, 0.0) for pid in node["ids"])
                
                clean_level.append({
                    "name": node["name"],
                    "field": node.get("field", "unknown"),
                    "value": node["value"],
                    "total_cost": round(node_cost, 2),
                    "parent_idx": node.get("parent_idx")
                })
            final_output.append(clean_level)
            
        return final_output
