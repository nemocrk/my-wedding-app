# Backend API Documentation

Il backend espone API RESTful sviluppate con Django REST Framework.
Le API sono divise in due macro-categorie:
1. **Public API**: Accessibili dagli invitati (Internet). Protette da Session + Token HMAC.
2. **Admin API**: Accessibili solo dalla rete interna (Intranet) o VPN. Gestione completa.

## Authentication & Security

### Public API
- **Session-Based**: L'accesso inizia con una `POST /api/public/auth/` inviando `code` e `token`.
- **HMAC Verification**: Il token nell'URL viene validato crittograficamente usando una `SECRET_KEY` lato server.
- **Session Persistence**: Dopo l'autenticazione, `invitation_id` viene salvato nella sessione server-side (cookie `sessionid`).
- **Read-Only Endpoints**: Alcuni endpoint pubblici (es. `/api/public/texts/`) non richiedono autenticazione se servono dati statici/configurabili globali.

### Admin API
- **Network Isolation**: In produzione, queste API non sono esposte su Internet (blocco Nginx).
- **Django Auth**: Richiedono utente Staff/Superuser (Session Auth standard).

---

## Endpoint Reference

### 🌍 Public Endpoints (`/api/public/`)

#### `POST /auth/`
Inizia una sessione ospite.
- **Body**: `{ "code": "rossi-family", "token": "a1b2c3d4..." }`
- **Response**: `{ "valid": true, "invitation": { ... } }`

#### `GET /invitation/`
Recupera i dati dell'invito corrente (dalla sessione).
- **Response**: Dettagli invito + lista ospiti (Person).

#### `POST /rsvp/`
Invia o aggiorna la risposta (RSVP).
- **Body**: 
  ```json
  {
    "status": "confirmed", // o "declined"
    "accommodation_requested": true,
    "transfer_requested": false
  }
  ```

#### `GET /texts/`
Recupera la configurazione dei testi dinamici (CMS).
- **Auth**: Pubblica, nessuna autenticazione richiesta.
- **Response**: Mappa chiave-valore con tutti i testi configurati.
  ```json
  {
    "home.welcome": "<p>Benvenuti al nostro matrimonio...</p>",
    "card.logistics": "..."
  }
  ```

#### `POST /log-interaction/`
Traccia eventi analitici (es. click su bottoni).
- **Body**: `{ "event_type": "click_cta", "metadata": { "btn": "map" } }`

---

### 🔒 Admin Endpoints (`/api/admin/`)

#### Invitations (`/invitations/`)
CRUD completo sugli inviti con supporto filtri avanzati.

**Base CRUD:**
- `GET /` : Lista paginata inviti.
- `POST /` : Crea nuovo invito.
- `GET /{id}/` : Dettaglio invito.
- `PUT /{id}/` : Aggiorna invito.
- `DELETE /{id}/` : Elimina invito.

**Filtri Query Params (GET /):**
- `?status=confirmed` : Filtra per stato (sent, read, confirmed, declined).
- `?label=<label_id>` : Filtra per etichetta assegnata.
- `?origin=groom` : Filtra per origine (groom|bride).
- `?accommodation_pinned=true` : Filtra inviti con alloggio bloccato.
- `?search=rossi` : Ricerca testuale su nome o codice.
- `?ordering=-created_at` : Ordinamento (created_at, status, name).

**Custom Actions:**
- `GET /{id}/generate_link/` : Genera URL pubblico con token valido.
- `POST /{id}/mark-as-sent/` : Imposta manualmente lo stato a "Inviato" (senza inviare messaggi).
- `POST /bulk-send/` : Imposta multipli inviti come "Inviati" (batch mark-as-sent).
  - **Body**: `{ "invitation_ids": [1, 2, 3] }`
  - **Response**: `{ "success": true, "updated_count": 3, "message": "3 inviti segnati come Inviati" }`
- `GET /{id}/interactions/` : Storico log interazioni.
- `GET /{id}/heatmaps/` : Dati heatmap sessioni utente.

**Label Support (Create/Update):**
Per assegnare etichette a un invito:
```json
{
  "name": "Famiglia Rossi",
  "label_ids": [1, 3],  // Array di ID etichette (write-only)
  "guests": [...]
}
```
In lettura, il campo `labels` contiene oggetti completi:
```json
{
  "labels": [
    { "id": 1, "name": "VIP", "color": "#FF5733" },
    { "id": 3, "name": "Colleghi", "color": "#3498DB" }
  ]
}
```

#### Invitation Labels (`/invitation-labels/`)
CRUD per le etichette personalizzate.

- `GET /` : Lista tutte le etichette.
- `POST /` : Crea nuova etichetta.
  - **Body**: `{ "name": "VIP", "color": "#FF5733" }`
- `PUT /{id}/` : Aggiorna etichetta.
- `DELETE /{id}/` : Elimina etichetta.

**Filtri:**
- `?search=VIP` : Ricerca per nome etichetta.

#### Configurable Texts (`/texts/`)
Gestione CMS testi dinamici.
- `GET /`: Lista tutti i testi configurabili.
- `GET /{key}/`: Dettaglio singolo testo (lookup field = key).
- `PATCH /{key}/`: Aggiorna contenuto testo.
  - Body: `{ "content": "<p>Nuovo contenuto...</p>" }`

#### Accommodations (`/accommodations/`)
Gestione strutture e stanze.

**Base CRUD:**
- `GET /` : Lista alloggi.
- `POST /` : Crea alloggio con stanze.
- `PUT /{id}/` : Aggiorna alloggio.
- `DELETE /{id}/` : Elimina alloggio.

**Custom Actions:**
- `POST /auto-assign/`: Lancia l'algoritmo di assegnazione automatica.
  - **Body**: 
    ```json
    {
      "strategy": "SPACE_OPTIMIZER",  // o "SIMULATION" per test
      "reset_previous": false
    }
    ```
  - **Behavior con `accommodation_pinned`**:
    - Inviti con `accommodation_pinned=True` vengono **esclusi** sia dal reset che dall'assegnazione.
    - Le loro stanze sono considerate **occupate** e non disponibili per nuove assegnazioni.
    - Questo permette di "bloccare" manualmente alcune assegnazioni critiche (es. suite sposi).

#### WhatsApp Templates (`/whatsapp-templates/`)
Gestione template messaggi.
- `GET /` : Lista template.
- `POST /` : Crea template.
- `PUT /{id}/` : Aggiorna template.
- `DELETE /{id}/` : Elimina template.

**Schema Template:**
```json
{
  "name": "Conferma Ricezione",
  "condition": "status_change", // o "manual"
  "trigger_status": "read", // "sent", "confirmed", etc. (solo se condition=status_change)
  "content": "Ciao {name}, abbiamo ricevuto la tua risposta!",
  "is_active": true
}
```

#### Dashboard (`/dashboard/stats/`)
- `GET /`: Restituisce contatori aggregati (Ospiti, Budget, Logistica).

#### Config (`/config/`)
Gestione singleton `GlobalConfig`.
- `GET /`: Leggi configurazione attuale.
- `POST /`: Aggiorna prezzi e testi.

#### WhatsApp (`/whatsapp/`)
Gestione integrazione WAHA.
- `GET /{type}/status/`: Status sessione (connected/disconnected/qr).
- `POST /{type}/refresh/`: Forza refresh sessione.
- `POST /{type}/test/`: Invia messaggio test al numero admin.

---

## Data Models (JSON Schemas)

### Configurable Text Object
```json
{
  "id": 10,
  "key": "home.welcome",
  "group": "home",
  "description": "Testo intro busta",
  "content": "<p>Benvenuti...</p>",
  "updated_at": "2026-01-15T10:00:00Z"
}
```

### Invitation Label Object
```json
{
  "id": 1,
  "name": "VIP",
  "color": "#FF5733"
}
```

### Invitation Object (Extended)
```json
{
  "id": 1,
  "code": "rossi-family",
  "name": "Famiglia Rossi",
  "status": "confirmed",
  "origin": "groom", // "groom" | "bride"
  "phone_number": "+393331234567",
  "accommodation_offered": true,
  "accommodation_pinned": false,  // NEW: Blocca auto-assegnazione
  "transfer_offered": false,
  "labels": [  // NEW: Etichette assegnate (read-only)
    { "id": 1, "name": "VIP", "color": "#FF5733" }
  ],
  "guests": [
    { "first_name": "Mario", "is_child": false },
    { "first_name": "Luigi", "is_child": true }
  ]
}
```

---

## Workflow Examples

### Scenario 1: Bulk Send Invitations
1. Filtra inviti da inviare: `GET /api/admin/invitations/?status=created`
2. Batch update: `POST /api/admin/invitations/bulk-send/` con `{"invitation_ids": [...]}`
3. Verifica cambio stato: tutti gli inviti passano a `status=sent`

### Scenario 2: Gestire Etichette VIP
1. Crea etichetta: `POST /api/admin/invitation-labels/` → `{"name": "VIP", "color": "#FFD700"}`
2. Assegna a inviti: `PATCH /api/admin/invitations/{id}/` → `{"label_ids": [1]}`
3. Filtra VIP: `GET /api/admin/invitations/?label=1`

### Scenario 3: Bloccare Suite Sposi dall'Auto-Assign
1. Assegna manualmente gli sposi alla suite.
2. Imposta `accommodation_pinned=true` sull'invito sposi.
3. Lancia auto-assign: la suite sposi rimarrà intoccata e sarà considerata occupata.
