# Dynamic Pie Chart - Documentazione Tecnica

## Overview

Il **Dynamic Pie Chart** è un componente avanzato di visualizzazione dati che permette di creare grafici a torta multi-livello basati su filtri dinamici selezionati dall'utente. La caratteristica principale è la capacità di mostrare gerarchicamente le relazioni tra diversi attributi degli inviti (origin, status, labels) in modo visivamente allineato.

## Architettura

### Backend

#### 1. Analytics Engine (`backend/core/analytics.py`)

Classe principale: `DynamicPieChartEngine`

**Algoritmo:**

1. **Preload Matches**: Pre-calcola quali filtri matchano per ogni invito
   ```python
   # Esempio:
   invitation_matches = {
       1: {'groom', 'sent'},
       2: {'groom', 'Label1'},
       3: {'bride', 'sent', 'Label2'}
   }
   ```

2. **Max Disjoint Subset**: Trova il subset di filtri disgiunti che copre il massimo numero di inviti
   - Usa `itertools.combinations` per generare tutte le combinazioni possibili
   - Verifica la disgiunzione (nessun invito appartiene a più di un filtro della combinazione)
   - Seleziona la combinazione con copertura massima

3. **Recursive Splitting**: Per ogni livello successivo:
   - Sceglie il filtro rimanente che meglio divide i dati (greedy: quello con più match)
   - Splitta ogni nodo del livello precedente in "has filter" vs "other"
   - Mantiene il riferimento al parent tramite `parent_idx`

**Output Structure:**
```json
{
  "levels": [
    [
      {"name": "groom", "value": 40, "parent_idx": null},
      {"name": "Label2", "value": 10, "parent_idx": null},
      {"name": "other", "value": 50, "parent_idx": null}
    ],
    [
      {"name": "sent", "value": 20, "parent_idx": 0},
      {"name": "other", "value": 20, "parent_idx": 0},
      {"name": "sent", "value": 10, "parent_idx": 1},
      {"name": "other", "value": 50, "parent_idx": 2}
    ]
  ],
  "meta": {
    "total": 100,
    "available_filters": {...}
  }
}
```

#### 2. API Endpoint

**URL**: `GET /api/admin/dashboard/dynamic-stats/?filters=groom,sent,Label2`

**Response**: Vedi struttura sopra

**Query Params**:
- `filters`: Lista di valori separati da virgola (es. `groom,sent,Label2`)

### Frontend

#### 1. DynamicPieChart Component (`frontend-admin/src/components/DynamicPieChart.jsx`)

**Features**:
- UI per selezione filtri (origins, statuses, labels)
- Chiamata API dinamica al cambio filtri
- Calcolo degli angoli per allineamento multi-livello
- Rendering con Recharts usando multiple `<Pie>` concentriche

**Calcolo Angoli**:
```javascript
function calculateAngles() {
  // Level 1: distribuzione uniforme 0-360°
  
  // Level 2+: ogni nodo figlio occupa una porzione dell'angolo del parent
  // proporzionale al suo valore rispetto ai siblings
  
  const parentAngleStart = parent.startAngle;
  const parentAngleEnd = parent.endAngle;
  const childPercentage = node.value / totalSiblings;
  
  node.startAngle = currentChildAngle;
  node.endAngle = currentChildAngle + (parentAngleEnd - parentAngleStart) * childPercentage;
}
```

**Color Scheme**:
- Mappa predefinita per valori comuni (groom, bride, sent, etc.)
- Generazione HSL dinamica per label custom

## Testing

### Test Backend (`backend/core/tests/test_analytics.py`)

**Dataset**: 100 inviti con pattern specifici
- 1-10: Groom, Sent, Label1
- 11-20: Groom, Sent
- 21-40: Groom, Imported
- 41-50: Bride, Sent, Label2
- 51-60: Bride, Confirmed
- 61-100: Bride, Declined

**Test Case**: Filtri `['groom', 'sent', 'Label2']`

**Expected**:
- Level 1: `groom: 40, Label2: 10, other: 50`
- Level 2: Splits per `sent`
  - Sotto groom: `sent: 20, other: 20`
  - Sotto Label2: `sent: 10`
  - Sotto other: `other: 50`

**Run Test**:
```bash
cd backend
python manage.py test core.tests.test_analytics
```

## Esempi d'Uso

### Scenario 1: Analisi Origin + Status
**Filtri**: `['groom', 'bride', 'sent', 'confirmed']`

**Level 1**: Partizione disgiunta massima (es. `groom`, `bride`)
**Level 2**: Split per `sent` vs `confirmed` dentro ogni origin

### Scenario 2: Analisi Label-Heavy
**Filtri**: `['Label1', 'Label2', 'Label3', 'sent']`

**Level 1**: Label disgiunte
**Level 2**: Split per `sent` dentro ogni label

## Limitazioni Note

1. **Complessità Combinatoria**: Con 10+ filtri, il calcolo delle combinazioni può rallentare. Attualmente limitato a max 4 livelli.

2. **Allineamento Visivo**: Recharts non supporta nativamente angoli custom per `<Cell>`. L'implementazione attuale usa `startAngle`/`endAngle` sui singoli entry, ma potrebbe richiedere testing approfondito per edge cases.

3. **Label Multiple**: Un invito con multiple label viene contato come appartenente alla **prima label matchata** nell'ordine di selezione.

## Future Improvements

- [ ] Supporto per Sunburst Chart (libreria D3.js)
- [ ] Cache lato backend per query frequenti
- [ ] Export PNG/SVG del grafico
- [ ] Tooltip con drill-down ai dettagli degli inviti
- [ ] Animazioni di transizione tra configurazioni di filtri

## Riferimenti

- [Recharts Pie Documentation](https://recharts.org/en-US/api/Pie)
- [Two Level Pie Chart Example](https://recharts.github.io/en-US/examples/TwoLevelPieChart/)
- Algoritmo Greedy Set Cover: https://en.wikipedia.org/wiki/Set_cover_problem
