# Backend Core (Models & Logic)

Questa sezione analizza in dettaglio la Business Logic del sistema, definita in `backend/core/models.py`.

## 1. Configurazione Globale (`GlobalConfig`)

Il sistema utilizza un modello Singleton per gestire i parametri "live" del matrimonio senza dover redeployare il codice.

- **Logica Singleton**: Override del metodo `save()` per impedire la creazione di più di un'istanza.
- **Parametri**:
  - `price_*`: Costi unitari per calcoli budget automatici.
  - `invitation_link_secret`: Salt per la generazione di token HMAC sicuri.
  - `whatsapp_*`: Configurazioni per l'integrazione WhatsApp.

## 2. Gestione Contenuti Dinamici (`ConfigurableText`)

Modulo CMS leggero per permettere agli sposi di modificare i testi dell'applicazione (es. lettera di benvenuto, card informative) senza interventi tecnici.

- **Struttura Key-Value**:
  Ogni blocco di testo è identificato da una chiave univoca (es. `home.welcome`, `card.logistics`).
  - `key`: Identificativo univoco (slug-like).
  - `group`: Raggruppamento logico per facilitare la gestione in admin (es. `home`, `cards`, `rsvp`).
  - `content`: Testo ricco (HTML safe) o plain text.
  - `description`: Metadato per spiegare agli sposi dove appare questo testo.

- **API Pubbliche vs Admin**:
  - Le API pubbliche (`PublicConfigurableTextView`) espongono solo una mappa `{key: content}` in sola lettura, ottimizzata per il frontend user.
  - Le API admin permettono il CRUD completo.

## 3. Gestione Inviti (`Invitation` & `Person`)

Il cuore del sistema.

### Modello `Invitation`

Raggruppa un nucleo familiare.

- **Codice Univoco (`code`)**: Slug utilizzato nell'URL pubblico. È la chiave di accesso principale.
- **Contatti & Origine**:
  - `origin`: Enum (`groom`/`bride`) fondamentale per organizzazione tavoli e statistiche.
  - `phone_number`: Numero per invio automatizzato inviti via WhatsApp.
  - `contact_verified`: Enum (`ok`, `not_valid`, `not_exist`, `not_present`) che indica lo stato di verifica del numero su WhatsApp.
- **Etichette (Labels)** 🆕:
  - `labels`: Relazione ManyToMany con `InvitationLabel`. Permette di categorizzare gli inviti (es. "VIP", "Colleghi", "Famiglia Stretta").
  - **Utilizzo**: Filtraggio e organizzazione visiva nella dashboard admin, segnalazione di gruppi speciali (es. bambini, ospiti con esigenze particolari).
- **Affinities**: Relazione molti-a-molti ricorsiva per indicare gruppi amici (usato dall'algoritmo di assegnazione stanze).
- **Workflow Status**:
  Gestisce il ciclo di vita dell'invito:
  1. `imported`: Importato da file esterno (CSV/Excel).
  2. `created`: Inserito manualmente a sistema.
  3. `sent`: Messaggio inviato agli ospiti.
  4. `read`: Gli ospiti hanno visualizzato la pagina (pixel tracking).
  5. `confirmed` / `declined`: Scelta finale.
- **Flags Logistici**:
  - `accommodation_offered`: Se True, sblocca il form "Richiesta Alloggio" nel frontend.
  - `transfer_offered`: Se True, sblocca la selezione "Navetta".
  - `accommodation_pinned` 🆕: Se True, l'algoritmo di auto-assegnazione salta questo invito, preservando la stanza assegnata manualmente. **Caso d'uso**: Inviti VIP o con esigenze speciali che richiedono un controllo manuale degli alloggi.
- **Token HMAC**: Il metodo `generate_verification_token` crea una firma crittografica basata su `code + id + secret_key` per validare le richieste API pubbliche e prevenire ID enumeration.

### Modello `InvitationLabel` 🆕

Dizionario delle etichette disponibili per categorizzare gli inviti.

- `name`: Nome univoco (es. "VIP", "Colleghi", "Famiglia").
- `color`: Colore HEX per badge UI (es. "#FF5733").
- **CRUD Admin**: Le etichette vengono gestite tramite un'interfaccia dedicata nella dashboard admin (`/api/admin/invitation-labels/`).
- **Utilizzo**:
  - Filtraggio avanzato nella lista inviti.
  - Visualizzazione con badge colorati.
  - Selezione bulk per azioni massive (es. invio WhatsApp a tutti gli inviti con label "Colleghi").

### Modello `Person`

Rappresenta il singolo ospite.

- `is_child`: Booleano critico per:
  - Calcolo posti letto (Bambini < Adulti).
  - Calcolo costi pasti (Menu ridotto).
- `assigned_room`: FK verso `Room`, permette un'assegnazione granulare degli ospiti alle stanze disponibili.

## 4. Automazione e Workflow (Signals)

Il sistema implementa logiche reattive tramite Django Signals (`backend/core/signals.py`).

### Verifica Contatto WhatsApp (`Invitation.contact_verified`)

Quando un numero viene creato o modificato, o lo stato viene resettato manualmente a `not_valid`:

1. Il signal `post_save` intercetta il cambio.
2. Lancia il task sincrono `verify_whatsapp_contact_task` (in `utils.py`).
3. Il task chiama il microservizio `whatsapp-integration` (`GET /api/contacts`) che verifica:
    - Esistenza del numero su WhatsApp.
    - Presenza del numero nella rubrica della sessione (Sposo/Sposa).
4. Lo stato `contact_verified` viene aggiornato con il risultato (`ok`, `not_exist`, `not_present`).

### Trigger Cambio Stato (`Invitation.status`)

Quando lo stato di un invito cambia (es. da `sent` a `read` o da `read` a `confirmed`), il sistema:

1. Verifica se esiste un `WhatsAppTemplate` attivo con `condition='status_change'` e `trigger_status` corrispondente al nuovo stato.
2. Se esiste, genera un messaggio personalizzato sostituendo i placeholder:
    - `{name}`: Nome invito (es. Famiglia Rossi)
    - `{code}`: Codice invito
    - `{link}`: Link pubblico autologin
    - `{guest_names}`: Lista nomi ospiti
3. Accoda il messaggio in `WhatsAppMessageQueue` per l'invio asincrono.

### Auto-Mark as Read

Quando viene registrata la prima analytics di tipo `visit` su un invito in stato `sent`:

- L'API `PublicLogInteractionView` aggiorna automaticamente lo stato a `read`.
- Questo triggera a cascata il signal di cui sopra (se configurato un template per lo stato `read`).

## 5. Gestione Alloggi (`Accommodation` & `Room`)

Sistema gerarchico per la gestione ospitalità.

### Logica "Available Slots"

Il modello `Room` implementa una logica smart per il calcolo della disponibilità (`available_slots()`):

1. Conta gli occupanti attuali (Adulti e Bambini).
2. I bambini occupano prioritariamente i posti "bambino" (`capacity_children`).
3. Se i posti bambino sono esauriti, i bambini "traboccano" sui posti adulto.
4. Restituisce un dizionario con posti liberi distinti per tipo.

### Algoritmo Assegnazione Automatica (Arena delle Strategie)

Il sistema implementa una **Arena Multi-Strategia** per l'assegnazione ottimale degli ospiti.
L'endpoint `/auto-assign` può essere chiamato in due modalità:

1. **SIMULATION**: Esegue in parallelo (in transazioni safe-rollback) diverse strategie e restituisce un report comparativo (spazio sprecato, % copertura).
2. **EXECUTION**: Applica la strategia scelta e committa le modifiche al DB.

#### Le Strategie Disponibili

1. **STANDARD**: Priorità Affinità, Stanze Grandi prima. (Classico).
2. **SPACE_OPTIMIZER**: (Tetris) Inviti Grandi prima, Stanze Piccole (Best Fit).
3. **CHILDREN_FIRST**: Priorità Inviti con bambini, Stanze con letti bambino.
4. **PERFECT_MATCH**: Cerca solo incastri perfetti (Capienza == Ospiti).
5. **SMALLEST_FIRST**: Inviti Piccoli prima, Stanze Piccole prima.
6. **AFFINITY_CLUSTER**: Tratta i gruppi affini come blocchi monolitici.

#### Regole Inviolabili (Tutte le strategie)

1. **Regola 1 (Isolamento)**: Una stanza può contenere SOLO persone dello stesso invito.
2. **Regola 2 (Compatibilità)**: Una struttura non può ospitare inviti tra loro "non affini".
3. **Regola 3 (Atomicità)**: Tutte le persone di un invito devono trovare posto nella stessa struttura (in una o più stanze), altrimenti l'intero invito non viene assegnato (Rollback).
4. **Regola 4 (Slot)**: Adulti solo in slot adulti; Bambini in slot bambini o adulti.
5. **Regola 5 (Pinning)** 🆕: Se `invitation.accommodation_pinned` è True, l'invito viene escluso dalla riassegnazione e la sua stanza è considerata occupata a priori. **Implementazione**: Prima di svuotare le assegnazioni (`assigned_room = None`), filtrare gli inviti con `accommodation_pinned=False`. Le stanze con ospiti "pinned" devono essere marcate come NON disponibili per le altre strategie.

> **⚠️ NOTA TECNICA IMPORTANTE (Prefetch vs Live Query)**
> L'algoritmo utilizza `prefetch_related` per efficienza, MA per il controllo dell'owner della stanza (`get_room_owner`) è **OBBLIGATORIO** eseguire una query "live" sul database (`Person.objects.filter(...)`).
> Usare i dati prefetched (`room.assigned_guests.all()`) causerebbe letture "stale" (vecchie) all'interno della stessa transazione, portando alla violazione della Regola 1 (più inviti nella stessa stanza).

### Bulk Actions & Operazioni Massive 🆕

La dashboard admin supporta selezione multipla e azioni bulk:

- **Bulk Send WhatsApp**: Selezionare più inviti e accodare i messaggi in un'unica operazione.
- **Bulk Label Assignment**: Applicare/rimuovere label da gruppi di inviti selezionati.
- **Endpoint**: `/api/admin/invitations/bulk-send/` (POST con `invitation_ids: [...]`).

## 6. Analytics (`GuestInteraction` & `GuestHeatmap`)

Sistema di tracciamento integrato.

- **GuestInteraction**: Traccia eventi discreti (Visit, Click, RSVP). Include metadata (IP anonimizzato, Device Type).
- **GuestHeatmap**: Raccoglie stream di coordinate (X,Y) per generare mappe di calore dell'attenzione utente sul frontend.

### Dynamic Stats (Dashboard Admin) 🆕

L'endpoint `/api/admin/dashboard/dynamic-stats/` (POST) fornisce statistiche gerarchiche (pie chart multilivello).

- **Filtri Supportati**:
  - `origin:groom`, `origin:bride`
  - `status:confirmed`, `status:declined`, `status:pending`
  - `labels:NOME_LABEL`
  - `has_children`
  - `accommodation:offered`, `accommodation:requested`
  - `transfer:requested`
- **Output**:
  - Struttura `levels` (array di array) per rendering di PieChart concentrici.
  - Metadati aggregati: `total` (conteggio persone filtrate) e `total_cost` (stima budget basata su `GlobalConfig`).
  - Campo `total_cost`: Calcolato dinamicamente sommando (Adulti *PrezzoAdulto) + (Bambini* PrezzoBambino) + (Alloggi/Transfer se richiesti).

## Diagramma Classi Core

```mermaid
classDiagram
    class GlobalConfig {
        +Decimal price_adult_meal
        +String invitation_link_secret
        +save()
    }
    
    class ConfigurableText {
        +String key
        +Text content
        +String group
    }

    class Invitation {
        +Slug code
        +Enum origin
        +String phone_number
        +Enum contact_verified
        +Enum status
        +Boolean accommodation_offered
        +Boolean accommodation_pinned
        +generate_token()
    }
    
    class InvitationLabel {
        +String name
        +String color
    }

    class Person {
        +Boolean is_child
        +FK assigned_room
    }

    class Room {
        +Int capacity_adults
        +Int capacity_children
        +available_slots()
    }

## 7. Gestione Fornitori (`SupplierType` & `Supplier`)

Questo progetto introduce i modelli `SupplierType` e `Supplier` per tracciare i fornitori dell'evento e i relativi costi.

- `SupplierType`:
    - `name`: string (es. Catering, Foto, Fiori)
    - `description`: testo opzionale

- `Supplier`:
    - `name`: string
    - `type`: FK -> `SupplierType` (on_delete=PROTECT)
    - `cost`: Decimal(12,2)
    - `currency`: CharField(3) (MVP: assumiamo `EUR`)
    - `contact`: JSONField (telefono/email meta)
    - `notes`: testo opzionale

Business rules:
- I costi dei fornitori sono considerati costi "evento-level" e saranno sommati nel calcolo del budget mostrato in Dashboard (`/api/admin/dashboard/stats/`).
- In questa prima iterazione non viene gestita la multi-valuta (MVP). Tutti i costi sono trattati come `EUR`.

Endpoints amministrativi disponibili:
- `GET|POST /api/admin/supplier-types/` - CRUD tipi fornitore
- `GET|POST /api/admin/suppliers/` - CRUD fornitori, supporta filtro `?type=`, `?min_cost=`, `?max_cost=` e ordinamento su `cost`

Testing:
- Aggiunti test unitari per la creazione dei modelli e per la verifica che l'endpoint dashboard includa il totale dei fornitori nel breakdown.


    class WhatsAppTemplate {
        +String name
        +Enum condition
        +Enum trigger_status
        +String content
    }

    Invitation "1" *-- "*" Person : contains
    Invitation "*" -- "*" InvitationLabel : labeled_by
    Room "1" o-- "*" Person : houses
    WhatsAppTemplate "1" .. "*" Invitation : triggers
```

## Legenda Simboli 🆕

- 🆕 = Novità introdotte nelle issues #51-54 del branch `feature/inviti-labels-bulk-alloggi` e nella issue #97 (`feat/dynamic-stats-evolution`).
