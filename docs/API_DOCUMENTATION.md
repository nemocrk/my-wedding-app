# API Documentation - My-Wedding-App

## Base URLs

- **Production**: `https://yourdomain.com/api`
- **Development (Public)**: `http://localhost/api`
- **Development (Admin)**: `http://localhost:8080/api`

## Autenticazione

### Admin Endpoints

Gli endpoint amministrativi richiedono autenticazione con **Token DRF**.

#### Ottenere un Token

```http
POST /api/auth/token/
Content-Type: application/json

{
  "username": "admin",
  "password": "your_password"
}
```

**Response:**

```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
}
```

#### Usare il Token

Includi l'header Authorization in tutte le richieste protette:

```http
GET /api/admin/guests/
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

## Endpoints Pubblici (Frontend User)

### 1. Health Check

Verifica che l'API sia online e il database connesso.

```http
GET /api/health/
```

**Response:**

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-01-03T17:00:00Z"
}
```

### 2. Verifica Invito

Verifica se un invitato esiste usando il codice univoco.

```http
GET /api/guest/check/{code}/
```

**Parametri URL:**

- `code` (string): Codice univoco invitato (es. "SMITH-JOHN-001")

**Response Success (200):**

```json
{
  "exists": true,
  "guest": {
    "id": 1,
    "first_name": "John",
    "last_name": "Smith",
    "code": "SMITH-JOHN-001",
    "group_name": "Friends",
    "max_seats": 2,
    "has_responded": false
  }
}
```

**Response Not Found (404):**

```json
{
  "exists": false,
  "error": "Guest not found"
}
```

### 3. Inviare Risposta Invito

Permette all'invitato di confermare/declinare la partecipazione.

```http
POST /api/guest/response/
Content-Type: application/json

{
  "code": "SMITH-JOHN-001",
  "will_attend": true,
  "num_attendees": 2,
  "dietary_restrictions": "Vegetarian",
  "message": "Looking forward to it!"
}
```

**Request Body:**

| Campo | Tipo | Required | Descrizione |
|-------|------|----------|-------------|
| `code` | string | ✓ | Codice univoco invitato |
| `will_attend` | boolean | ✓ | true = partecipa, false = declina |
| `num_attendees` | integer | ✓ | Numero di persone (max: `guest.max_seats`) |
| `dietary_restrictions` | string | ✗ | Note alimentari (max 500 caratteri) |
| `message` | string | ✗ | Messaggio personalizzato (max 1000 caratteri) |

**Response Success (201):**

```json
{
  "success": true,
  "response_id": 42,
  "guest": {
    "first_name": "John",
    "last_name": "Smith"
  },
  "message": "Response saved successfully"
}
```

**Response Error (400):**

```json
{
  "success": false,
  "errors": {
    "num_attendees": ["Number of attendees exceeds maximum seats (2)"]
  }
}
```

### 4. Recupera Risposta Esistente

Ottiene la risposta già inviata da un invitato.

```http
GET /api/guest/response/{code}/
```

**Response Success (200):**

```json
{
  "has_responded": true,
  "response": {
    "id": 42,
    "will_attend": true,
    "num_attendees": 2,
    "dietary_restrictions": "Vegetarian",
    "message": "Looking forward to it!",
    "created_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Response Not Found (404):**

```json
{
  "has_responded": false
}
```

### 5. Tracking Analytics (Frontend User)

Traccia le interazioni degli utenti per analytics.

#### Pageview

```http
POST /api/tracking/pageview/
Content-Type: application/json

{
  "guest_code": "SMITH-JOHN-001",
  "page": "/invitation",
  "referrer": "https://google.com",
  "user_agent": "Mozilla/5.0...",
  "ip_address": "192.168.1.1"
}
```

**Response (201):**

```json
{
  "success": true,
  "view_id": 123
}
```

#### Envelope Interaction (Animazione Busta)

```http
POST /api/tracking/envelope/
Content-Type: application/json

{
  "guest_code": "SMITH-JOHN-001",
  "action": "opened",
  "duration_ms": 3500
}
```

**Parametri:**

- `action` (string): "opened" | "closed" | "hovered"
- `duration_ms` (integer): Durata interazione in millisecondi

**Response (201):**

```json
{
  "success": true,
  "interaction_id": 456
}
```

## Endpoints Amministrativi (Frontend Admin)

**Nota**: Tutti gli endpoint admin richiedono il token nell'header:

```http
Authorization: Token <your_token>
```

### 6. Lista Invitati

Ottiene la lista completa degli invitati con paginazione.

```http
GET /api/admin/guests/?page=1&page_size=20
```

**Query Parameters:**

- `page` (integer): Numero pagina (default: 1)
- `page_size` (integer): Elementi per pagina (default: 20, max: 100)
- `group` (string): Filtra per gruppo (es. "Family", "Friends")
- `has_responded` (boolean): Filtra per risposta ("true", "false")
- `search` (string): Cerca per nome/cognome

**Response (200):**

```json
{
  "count": 150,
  "next": "http://localhost/api/admin/guests/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Smith",
      "email": "john@example.com",
      "phone": "+1234567890",
      "code": "SMITH-JOHN-001",
      "group_name": "Friends",
      "max_seats": 2,
      "has_responded": true,
      "response": {
        "will_attend": true,
        "num_attendees": 2,
        "created_at": "2025-01-01T12:00:00Z"
      },
      "created_at": "2024-12-01T10:00:00Z",
      "updated_at": "2025-01-01T12:00:00Z"
    }
  ]
}
```

### 7. Dettaglio Invitato

Ottiene i dettagli completi di un singolo invitato.

```http
GET /api/admin/guests/{id}/
```

**Response (200):**

```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Smith",
  "email": "john@example.com",
  "phone": "+1234567890",
  "code": "SMITH-JOHN-001",
  "group_name": "Friends",
  "max_seats": 2,
  "notes": "Close friend from college",
  "has_responded": true,
  "response": {
    "id": 42,
    "will_attend": true,
    "num_attendees": 2,
    "dietary_restrictions": "Vegetarian",
    "message": "Looking forward to it!",
    "created_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-01T12:00:00Z"
  },
  "pageviews": [
    {
      "id": 123,
      "page": "/invitation",
      "timestamp": "2025-01-01T11:00:00Z"
    }
  ],
  "envelope_interactions": [
    {
      "id": 456,
      "action": "opened",
      "duration_ms": 3500,
      "timestamp": "2025-01-01T11:05:00Z"
    }
  ],
  "created_at": "2024-12-01T10:00:00Z",
  "updated_at": "2025-01-01T12:00:00Z"
}
```

### 8. Creare Invitato

```http
POST /api/admin/guests/
Content-Type: application/json
Authorization: Token <token>

{
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "phone": "+9876543210",
  "group_name": "Family",
  "max_seats": 3,
  "notes": "Aunt from mother's side"
}
```

**Response (201):**

```json
{
  "id": 151,
  "first_name": "Jane",
  "last_name": "Doe",
  "code": "DOE-JANE-151",
  "message": "Guest created successfully"
}
```

### 9. Aggiornare Invitato

```http
PATCH /api/admin/guests/{id}/
Content-Type: application/json
Authorization: Token <token>

{
  "max_seats": 4,
  "notes": "Updated: Bringing kids"
}
```

**Response (200):**

```json
{
  "id": 1,
  "first_name": "John",
  "max_seats": 4,
  "message": "Guest updated successfully"
}
```

### 10. Eliminare Invitato

```http
DELETE /api/admin/guests/{id}/
Authorization: Token <token>
```

**Response (204 No Content)**

### 11. Statistiche Dashboard (KPI) 🆕

Ottiene le statistiche aggregate per i KPI della dashboard (Conteggi, Logistica, Finanziari).

```http
GET /api/admin/dashboard/stats/
Authorization: Token <token>
```

**Response (200):**

```json
{
  "guests": {
    "total_adults": 150,
    "total_children": 10,
    "adults_confirmed": 100,
    "children_confirmed": 5,
    "adults_pending": 45,
    "children_pending": 5,
    "adults_declined": 5,
    "children_declined": 0
  },
  "invitations": {
    "total": 80,
    "sent": 75,
    "confirmed": 50,
    "declined": 5,
    "imported": 10,
    "created": 5,
    "read": 60
  },
  "logistics": {
    "accommodation": {
      "total_confirmed": 25,
      "confirmed_adults": 20,
      "confirmed_children": 5
    },
    "transfer": {
      "confirmed": 15
    }
  },
  "financials": {
    "estimated_total": 15000.00,
    "confirmed": 8000.00
  }
}
```

### 12. Statistiche Dinamiche (Grafici) 🆕

Ottiene dati nidificati per i grafici a torta dinamici (Dynamic Pie Chart).

```http
GET /api/admin/dashboard/dynamic-stats/?filters=groom,confirmed
Authorization: Token <token>
```

**Query Parameters:**

- `filters` (string): Lista separata da virgola di filtri attivi (es. "groom,bride,confirmed").

**Response (200):**

```json
{
  "levels": [
    [
      { "name": "groom", "field": "origin", "value": 60, "ids": [1,2,3], "parent_idx": null },
      { "name": "bride", "field": "origin", "value": 40, "ids": [4,5], "parent_idx": null }
    ],
    [
      { "name": "confirmed", "field": "status", "value": 50, "ids": [1,2,4], "parent_idx": 0 },
      { "name": "pending", "field": "status", "value": 10, "ids": [3], "parent_idx": 0 }
    ]
  ],
  "meta": {
    "total": 100,
    "available_filters": ["groom", "bride", "sent", "confirmed", "declined"]
  }
}
```

### 13. Heatmap Data

Ottiene i dati per la heatmap delle interazioni (per ora/giorno).

```http
GET /api/admin/heatmap/?days=30
Authorization: Token <token>
```

**Query Parameters:**

- `days` (integer): Numero di giorni da includere (default: 30, max: 365)

**Response (200):**

```json
{
  "period": "2024-12-04 to 2025-01-03",
  "data": [
    {
      "date": "2025-01-01",
      "hour": 10,
      "pageviews": 25,
      "envelope_interactions": 18,
      "responses": 5
    },
    {
      "date": "2025-01-01",
      "hour": 11,
      "pageviews": 32,
      "envelope_interactions": 24,
      "responses": 8
    }
  ]
}
```

### 14. Esporta Dati

Esporta la lista invitati in formato CSV/Excel.

```http
GET /api/admin/export/?format=csv
Authorization: Token <token>
```

**Query Parameters:**

- `format` (string): "csv" | "xlsx" (default: "csv")
- `group` (string): Filtra per gruppo
- `has_responded` (boolean): Filtra per risposta

**Response (200):**

```
Content-Type: text/csv
Content-Disposition: attachment; filename="guests_export_2025-01-03.csv"

First Name,Last Name,Email,Phone,Code,Group,Max Seats,Has Responded,Will Attend,Num Attendees
John,Smith,john@example.com,+1234567890,SMITH-JOHN-001,Friends,2,Yes,Yes,2
...
```

---

## 🆕 Nuovi Endpoints: Gestione Etichette (Labels)

### 15. Lista Etichette Invito

Ottiene tutte le etichette disponibili per categorizzare gli inviti.

```http
GET /api/admin/invitation-labels/
Authorization: Token <token>
```

**Response (200):**

```json
[
  {
    "id": 1,
    "name": "VIP",
    "color": "#FF5733",
    "created_at": "2025-01-01T10:00:00Z",
    "updated_at": "2025-01-01T10:00:00Z"
  },
  {
    "id": 2,
    "name": "Colleghi",
    "color": "#3498DB",
    "created_at": "2025-01-02T14:00:00Z",
    "updated_at": "2025-01-02T14:00:00Z"
  }
]
```

### 16. Creare Etichetta

```http
POST /api/admin/invitation-labels/
Content-Type: application/json
Authorization: Token <token>

{
  "name": "Famiglia Stretta",
  "color": "#27AE60"
}
```

**Request Body:**

| Campo | Tipo | Required | Descrizione |
|-------|------|----------|-------------|
| `name` | string | ✓ | Nome etichetta (max 50 caratteri, univoco) |
| `color` | string | ✓ | Colore HEX (es. "#FF5733") |

**Response (201):**

```json
{
  "id": 3,
  "name": "Famiglia Stretta",
  "color": "#27AE60",
  "created_at": "2026-01-19T13:00:00Z",
  "updated_at": "2026-01-19T13:00:00Z"
}
```

### 17. Aggiornare Etichetta

```http
PATCH /api/admin/invitation-labels/{id}/
Content-Type: application/json
Authorization: Token <token>

{
  "color": "#E74C3C"
}
```

**Response (200):**

```json
{
  "id": 1,
  "name": "VIP",
  "color": "#E74C3C",
  "updated_at": "2026-01-19T13:30:00Z"
}
```

### 18. Eliminare Etichetta

```http
DELETE /api/admin/invitation-labels/{id}/
Authorization: Token <token>
```

**Response (204 No Content)**

**Nota**: L'eliminazione rimuove l'etichetta da tutti gli inviti associati.

---

## 🆕 Nuovi Endpoints: Azioni Bulk

### 19. Bulk Send WhatsApp

Invia messaggi WhatsApp a più inviti contemporaneamente.

```http
POST /api/admin/invitations/bulk-send/
Content-Type: application/json
Authorization: Token <token>

{
  "invitation_ids": [1, 5, 12, 23],
  "template_id": 3,
  "session": "groom"
}
```

**Request Body:**

| Campo | Tipo | Required | Descrizione |
|-------|------|----------|-------------|
| `invitation_ids` | array[int] | ✓ | Lista ID inviti destinatari |
| `template_id` | integer | ✓ | ID template messaggio WhatsApp |
| `session` | string | ✓ | Sessione WhatsApp ("groom" o "bride") |

**Response (202 Accepted):**

```json
{
  "success": true,
  "queued_messages": 4,
  "skipped": [
    {
      "invitation_id": 5,
      "reason": "Missing phone number"
    }
  ],
  "message": "Messages queued for sending"
}
```

### 20. Bulk Verify Contacts

Verifica la validità dei numeri WhatsApp per più inviti.

```http
POST /api/admin/invitations/bulk-verify/
Content-Type: application/json
Authorization: Token <token>

{
  "invitation_ids": [1, 2, 3, 4, 5]
}
```

**Response (202 Accepted):**

```json
{
  "success": true,
  "verified_count": 5,
  "results": [
    {
      "invitation_id": 1,
      "status": "ok"
    },
    {
      "invitation_id": 2,
      "status": "not_exist"
    },
    {
      "invitation_id": 3,
      "status": "ok"
    }
  ]
}
```

### 21. Bulk Apply Labels

Applica o rimuove etichette da più inviti.

```http
POST /api/admin/invitations/bulk-labels/
Content-Type: application/json
Authorization: Token <token>

{
  "invitation_ids": [1, 2, 3],
  "label_ids": [1, 5],
  "action": "add"
}
```

**Request Body:**

| Campo | Tipo | Required | Descrizione |
|-------|------|----------|-------------|
| `invitation_ids` | array[int] | ✓ | Lista ID inviti target |
| `label_ids` | array[int] | ✓ | Lista ID etichette da applicare |
| `action` | string | ✓ | "add" (aggiungi) o "remove" (rimuovi) |

**Response (200):**

```json
{
  "success": true,
  "updated_count": 3,
  "message": "Labels applied successfully"
}
```

---

## 🆕 Nuovi Endpoints: Gestione Alloggi Avanzata

### 22. Pin/Unpin Accommodation

Blocca o sblocca l'assegnazione alloggio per un invito specifico (impedisce riassegnazione automatica).

```http
PATCH /api/admin/invitations/{id}/pin-accommodation/
Content-Type: application/json
Authorization: Token <token>

{
  "pinned": true
}
```

**Response (200):**

```json
{
  "id": 1,
  "accommodation_pinned": true,
  "message": "Accommodation assignment locked"
}
```

### 23. Edit Accommodation

Modifica i dettagli di una struttura alloggio esistente.

```http
PATCH /api/admin/accommodations/{id}/
Content-Type: application/json
Authorization: Token <token>

{
  "name": "Hotel Paradise (Updated)",
  "address": "Via Roma 123, Cagliari"
}
```

**Response (200):**

```json
{
  "id": 1,
  "name": "Hotel Paradise (Updated)",
  "address": "Via Roma 123, Cagliari",
  "rooms": [
    {
      "id": 101,
      "name": "101",
      "capacity_adults": 2,
      "capacity_children": 1
    }
  ],
  "updated_at": "2026-01-19T14:00:00Z"
}
```

---

## Codici di Stato HTTP

| Codice | Significato |
|--------|-------------|
| 200 | OK - Richiesta eseguita con successo |
| 201 | Created - Risorsa creata con successo |
| 202 | Accepted - Richiesta accettata per elaborazione asincrona |
| 204 | No Content - Richiesta eseguita, nessun contenuto da restituire |
| 400 | Bad Request - Dati inviati non validi |
| 401 | Unauthorized - Token mancante o non valido |
| 403 | Forbidden - Accesso negato |
| 404 | Not Found - Risorsa non trovata |
| 500 | Internal Server Error - Errore server |

## Rate Limiting

In produzione, l'API implementa rate limiting:

- **Endpoint pubblici**: 100 richieste/ora per IP
- **Endpoint admin**: 1000 richieste/ora per token

**Response Header:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704297600
```

## CORS

L'API accetta richieste solo da:

- `http://localhost` (dev)
- `http://localhost:8080` (dev admin)
- Domini configurati in `ALLOWED_HOSTS`

## Versionamento

Attualmente l'API è alla versione **v1** (implicita nel path `/api/`).

Versioni future saranno accessibili tramite:

- `/api/v2/...`
- Header `Accept: application/vnd.wedding.v2+json`

## Testing API

### Con cURL

```bash
# Health check
curl http://localhost/api/health/

# Verifica invitato
curl http://localhost/api/guest/check/SMITH-JOHN-001/

# Invia risposta
curl -X POST http://localhost/api/guest/response/ \
  -H "Content-Type: application/json" \
  -d '{"code":"SMITH-JOHN-001","will_attend":true,"num_attendees":2}'

# Admin: Lista invitati (con token)
curl http://localhost:8080/api/admin/guests/ \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"

# Admin: Crea etichetta
curl -X POST http://localhost:8080/api/admin/invitation-labels/ \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b" \
  -H "Content-Type: application/json" \
  -d '{"name":"VIP","color":"#FF5733"}'

# Admin: Bulk send WhatsApp
curl -X POST http://localhost:8080/api/admin/invitations/bulk-send/ \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b" \
  -H "Content-Type: application/json" \
  -d '{"invitation_ids":[1,2,3],"template_id":1,"session":"groom"}'
```

### Con Postman/Insomnia

Importa la collection:

```bash
# Genera OpenAPI schema
docker-compose exec backend python manage.py spectacular --file /tmp/openapi.yaml

# Copia localmente
docker cp my-wedding-app_backend_1:/tmp/openapi.yaml ./openapi.yaml
```

Importa `openapi.yaml` in Postman.

### Con DRF Browsable API

Naviga con un browser su:

- http://localhost/api/ (modalità sviluppo)

L'interfaccia interattiva ti permette di testare tutti gli endpoint.

## Riferimenti

- [Django REST Framework](https://www.django-rest-framework.org/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [HTTP Status Codes](https://httpstatuses.com/)

---

## Legenda Simboli 🆕
- 🆕 = Nuovi endpoint introdotti nelle issues #51-54 del branch `feature/inviti-labels-bulk-alloggi` e issue #62 `dashboard-stats`.
