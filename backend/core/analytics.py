from collections import defaultdict
from itertools import combinations
# from core.models import Invitation # Assumo sia importato

class DynamicPieChartEngine:
    def __init__(self, queryset, selected_filters):
        self.invitations = queryset
        self.selected_filters = set(selected_filters)
        self.cache_matches = {} 

    def _preload_matches(self):
        invitations = self.invitations.prefetch_related('labels')
        for inv in invitations:
            matches = []
            if inv.origin in self.selected_filters:
                matches.append({ 'value': inv.origin, 'field': 'origin' })
            if inv.status in self.selected_filters:
                matches.append({ 'value': inv.status, 'field': 'status' })
            
            # Label optimization
            inv_label_names = set(l.name for l in inv.labels.all())
            common_labels = inv_label_names.intersection(self.selected_filters)
            if common_labels:
                matches.extend({'value': label, 'field': 'labels'} for label in common_labels)
            
            self.cache_matches[inv.id] = matches

    def _check_match(self, inv_id, filter_value):
        matches = self.cache_matches.get(inv_id, [])
        return any(m['value'] == filter_value for m in matches)

    def _get_field_type(self, inv_id, filter_value):
        matches = self.cache_matches.get(inv_id, [])
        found = next((m for m in matches if m['value'] == filter_value), None)
        return found['field'] if found else 'unknown'

    def _get_max_disjoint_subset(self, candidate_filters, subset_invitation_ids):
        if not candidate_filters:
            return {}, list(subset_invitation_ids), []

        grouped_data = defaultdict(list)
        # Ottimizzazione: set per lookup veloce O(1) invece di O(N)
        candidate_filters_set = set(candidate_filters)

        for inv_id in subset_invitation_ids:
            matches = self.cache_matches.get(inv_id, [])
            for m in matches:
                f_val = m['value']
                if f_val in candidate_filters_set:
                    grouped_data[(f_val, m['field'])].append(inv_id)

        filter_coverage = [
            {"filter": f, "field": field, "inv_ids": inv_ids}
            for (f, field), inv_ids in grouped_data.items()
        ]
        
        filter_ids_lookup = {item["filter"]: item["inv_ids"] for item in filter_coverage}
        filter_fields_lookup = {item["filter"]: item["field"] for item in filter_coverage}
        active_filters = list(filter_ids_lookup.keys())

        if not active_filters:
            return {}, list(subset_invitation_ids), candidate_filters

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
            
        remaining_ids = [i for i in subset_invitation_ids if i not in covered_ids]
        
        # Ritorna i filtri che NON sono stati usati in questa partizione
        used_in_partition = set(partition.keys())
        remaining_filters = [f for f in active_filters if f not in used_in_partition] # Mantiene l'ordine originale

        return partition, remaining_ids, remaining_filters

    def _get_best_splitter(self, candidate_filters, subset_invitation_ids):
        best_filter = None
        max_covered = -1
        
        # Ottimizzazione: Pre-calcolo se subset è molto grande
        for f in candidate_filters:
            count = 0
            for inv_id in subset_invitation_ids:
                if self._check_match(inv_id, f):
                    count += 1
            
            # Se troviamo un filtro che copre TUTTI, è sicuramente il migliore, break anticipato
            if count == len(subset_invitation_ids) and count > 0:
                return f
                
            if count > max_covered:
                max_covered = count
                best_filter = f
                
        return best_filter if max_covered > 0 else None

    def calculate(self):
        self._preload_matches()
        
        all_ids = list(self.cache_matches.keys())
        remaining_filters = list(self.selected_filters)
        
        levels_data = []
        
        # --- LEVEL 1: Max Disjoint Partition ---
        partition, other_ids, remaining_filters = self._get_max_disjoint_subset(remaining_filters, all_ids)

        if not partition:
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
            
            # 3. Costruiamo i nodi del nuovo livello
            next_level_nodes = []
            
            for node in current_level_nodes:
                parent_ids = node["ids"]
                if not parent_ids:
                    continue
                    
                match_ids = []
                no_match_ids = []
                
                for iid in parent_ids:
                    for filter_key, data in partition.items():
                        if iid in data["ids"]:
                            if self._check_match(iid, filter_key):
                                match_ids.append({"filter": filter_key, "data": data, "iid": iid})
                
                # 1. Estrai gli ID che hanno trovato un match
                matched_iids = {m["iid"] for m in match_ids}

                # 2. Sottrai i matched_iids dal set totale dei parent_ids
                # Questo restituisce solo gli ID che non sono presenti in match_ids
                no_match_ids = list(set(parent_ids) - matched_iids)
                
                # --- NODO MATCH (Ha il filtro) ---
                if match_ids:
                    # 1. Usiamo un dizionario temporaneo per raggruppare
                    grouped_map = defaultdict(lambda: {"value": 0, "ids": []})

                    for match_id in match_ids:  # Il tuo for esterno
                        # Definiamo la chiave di raggruppamento
                        group_key = (
                            match_id["filter"],            # name
                            match_id["data"]["field"],     # field
                            node["name"],                  # parent
                            current_level_nodes.index(node) # parent_idx
                        )
                        
                        # 2. Aggreghiamo i dati
                        grouped_map[group_key]["value"] += 1
                        grouped_map[group_key]["ids"].append(match_id["iid"])

                    # 3. Trasformiamo il dizionario nella lista finale di oggetti per next_level_nodes
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
                        "name": "other",          # Si chiama sempre "other"
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
                
        # Pulizia finale (rimuovere liste IDs per JSON leggero)
        final_output = []
        for level in levels_data:
            clean_level = []
            for node in level:
                clean_level.append({
                    "name": node["name"],
                    "field": node.get("field", "unknown"),
                    "value": node["value"],
                    "parent_idx": node.get("parent_idx")
                })
            final_output.append(clean_level)
            
        return final_output