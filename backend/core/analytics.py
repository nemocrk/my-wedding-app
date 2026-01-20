from collections import defaultdict
from itertools import combinations
from django.db.models import Q
from core.models import Invitation

class DynamicPieChartEngine:
    def __init__(self, queryset, selected_filters):
        """
        queryset: Invitation QuerySet
        selected_filters: list of strings (e.g. ['groom', 'sent', 'Label2'])
        """
        self.invitations = queryset
        self.selected_filters = set(selected_filters)
        self.cache_matches = {} # {invitation_id: set_of_matched_filters}

    def _preload_matches(self):
        """Pre-calcola quali filtri matchano per ogni invito per evitare query N+1"""
        # Ottimizzazione: fetch label names in una query unica
        invitations = self.invitations.prefetch_related('labels')
        
        for inv in invitations:
            matches = set()
            
            # Check Origin
            if inv.origin in self.selected_filters:
                matches.add(inv.origin)
            
            # Check Status
            if inv.status in self.selected_filters:
                matches.add(inv.status)
            
            # Check Labels
            # Qui assumiamo che i label name siano univoci rispetto a origin/status
            # O che l'utente selezioni valori univoci
            inv_label_names = set(l.name for l in inv.labels.all())
            common_labels = inv_label_names.intersection(self.selected_filters)
            matches.update(common_labels)
            
            self.cache_matches[inv.id] = matches

    def _get_max_disjoint_subset(self, candidate_filters, subset_invitation_ids):
        """
        Trova il sottoinsieme di filtri (tra quelli candidati) che sono 
        mutuamente esclusivi e coprono il numero massimo di inviti 
        nel subset specificato.
        """
        if not candidate_filters:
            return {}, list(subset_invitation_ids)

        # 1. Calcola coverage per ogni filtro candidato nel subset corrente
        filter_coverage = defaultdict(set)
        for inv_id in subset_invitation_ids:
            matches = self.cache_matches[inv_id]
            for f in candidate_filters:
                if f in matches:
                    filter_coverage[f].add(inv_id)

        # Se nessun filtro copre nulla, esci
        active_filters = [f for f in filter_coverage if len(filter_coverage[f]) > 0]
        if not active_filters:
            return {}, list(subset_invitation_ids)

        best_combination = []
        best_coverage_count = -1
        
        # 2. Prova tutte le combinazioni (size 1 to N)
        # Nota: con pochi filtri (<10) è veloce.
        for r in range(1, len(active_filters) + 1):
            for combo in combinations(active_filters, r):
                
                # Verifica disgiunzione
                is_disjoint = True
                current_combo_coverage = set()
                
                for f in combo:
                    ids = filter_coverage[f]
                    # Se c'è intersezione con quanto già accumulato, non è disgiunto
                    if not current_combo_coverage.isdisjoint(ids):
                        is_disjoint = False
                        break
                    current_combo_coverage.update(ids)
                
                if is_disjoint:
                    if len(current_combo_coverage) > best_coverage_count:
                        best_coverage_count = len(current_combo_coverage)
                        best_combination = combo
        
        # 3. Costruisci il risultato
        partition = {}
        covered_ids = set()
        
        for f in best_combination:
            ids = filter_coverage[f]
            partition[f] = list(ids)
            covered_ids.update(ids)
            
        remaining_ids = [i for i in subset_invitation_ids if i not in covered_ids]
        
        return partition, remaining_ids

    def _get_best_splitter(self, candidate_filters, subset_invitation_ids):
        """
        Sceglie il miglior filtro singolo per splittare il subset.
        Criterio: quello che divide il subset nel modo più bilanciato (Max Entropia)
        o semplicemente quello che copre più elementi rimasti.
        
        Qui usiamo: quello che copre più elementi (Greedy).
        """
        best_filter = None
        max_covered = -1
        
        for f in candidate_filters:
            count = 0
            for inv_id in subset_invitation_ids:
                if f in self.cache_matches[inv_id]:
                    count += 1
            
            if count > max_covered:
                max_covered = count
                best_filter = f
                
        return best_filter

    def calculate(self):
        self._preload_matches()
        
        all_ids = list(self.cache_matches.keys())
        remaining_filters = list(self.selected_filters)
        
        levels_data = []
        
        # --- LEVEL 1: Max Disjoint Partition ---
        partition, other_ids = self._get_max_disjoint_subset(remaining_filters, all_ids)
        
        # Struttura dati per il frontend: una lista piatta di nodi con parent reference
        # Level 1 non ha parent
        l1_nodes = []
        for filter_key, ids in partition.items():
            l1_nodes.append({
                "name": filter_key,
                "value": len(ids),
                "ids": ids, # passiamo gli ID per il livello successivo
                "parent": None
            })
        
        if other_ids:
            l1_nodes.append({
                "name": "other",
                "value": len(other_ids),
                "ids": other_ids,
                "parent": None
            })
            
        levels_data.append(l1_nodes)
        
        # Rimuovi i filtri usati nel Level 1
        used_in_l1 = set(partition.keys())
        remaining_filters = [f for f in remaining_filters if f not in used_in_l1]
        
        # --- LEVEL 2+ (Ricorsivo / Iterativo) ---
        # Per ogni nodo del livello precedente, splittalo usando il miglior filtro rimasto
        
        current_level_nodes = l1_nodes
        
        # Continua finché ci sono filtri o finché decidiamo di fermarci
        while remaining_filters and len(levels_data) < 4: # Max 4 livelli per sicurezza
            next_level_nodes = []
            
            # Scegliamo UN filtro splitter globale per questo livello?
            # O un filtro diverso per ogni nodo padre?
            # Il prompt dice: "ordinarli in modo da ridurre al minimo la spacchettatura"
            # Semplificazione: Scegliamo il filtro che copre di più nel globale
            
            # Raccogli tutti gli ID del livello corrente per valutare il miglior splitter globale
            # (Alternativa: splitter locale per ogni nodo, ma diventa complesso visualmente)
            # Usiamo splitter LOCALE per massimizzare l'utilità dentro ogni fetta.
            
            # MA aspetta, se usiamo splitter diversi, la legenda del pie chart diventa un casino.
            # Tuttavia, nel pie chart concentrico, ogni settore è indipendente.
            # Proviamo a consumare i filtri uno alla volta.
            
            # Prendiamo il filtro che ha più impatto globale
            best_splitter = self._get_best_splitter(remaining_filters, all_ids)
            
            if not best_splitter:
                break # Nessun filtro rimasto ha match
                
            remaining_filters.remove(best_splitter)
            
            filter_name = best_splitter
            
            # Applichiamo questo splitter a TUTTI i nodi del livello precedente
            for node in current_level_nodes:
                parent_ids = node["ids"]
                if not parent_ids:
                    continue
                    
                # Split: Ha il filtro vs Non ha il filtro
                match_ids = []
                no_match_ids = []
                
                for iid in parent_ids:
                    if filter_name in self.cache_matches[iid]:
                        match_ids.append(iid)
                    else:
                        no_match_ids.append(iid)
                
                # Aggiungi i nodi figli
                if match_ids:
                    next_level_nodes.append({
                        "name": filter_name,
                        "value": len(match_ids),
                        "ids": match_ids,
                        "parent": node["name"], # serve un ID univoco in realtà, usiamo name per ora
                        "parent_idx": current_level_nodes.index(node) # Riferimento posizionale
                    })
                
                if no_match_ids:
                    next_level_nodes.append({
                        "name": "other",
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
                
        # Pulizia dati (rimuovere liste di ID prima di mandare al frontend)
        final_output = []
        for level in levels_data:
            clean_level = []
            for node in level:
                clean_level.append({
                    "name": node["name"],
                    "value": node["value"],
                    "parent_idx": node.get("parent_idx")
                })
            final_output.append(clean_level)
            
        return final_output
