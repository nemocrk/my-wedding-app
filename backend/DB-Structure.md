# Database Structure

## Core Models

### 1. Invitation (Partecipazione)
Rappresenta un singolo invito, che può essere destinato a un individuo o a un nucleo familiare.
Funge da aggregatore per gli ospiti e da punto centrale per le opzioni logistiche.

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | UUID | Chiave primaria univoca |
| `code` | Varchar(50) | Slug univoco per l'URL pubblico (es. `famiglia-rossi`) |
| `name` | Varchar(255) | Nome visualizzato (es. "Famiglia Rossi") |
| `accommodation_offered` | Boolean | Se `True`, a questo gruppo viene offerto l'alloggio |
| `transfer_offered` | Boolean | Se `True`, a questo gruppo viene offerto il transfer |
| `affinities` | M2M (Self) | Altri inviti con cui si vuole sedere vicino (Bidirezionale a livello logico) |
| `non_affinities` | M2M (Self) | Altri inviti con cui NON si vuole sedere vicino |
| `created_at` | DateTime | Timestamp creazione |

### 2. Person (Ospite)
Rappresenta una persona fisica collegata a un invito.

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | UUID | Chiave primaria |
| `invitation_id` | FK (Invitation) | Collegamento alla lettera di invito |
| `first_name` | Varchar(100) | Nome |
| `last_name` | Varchar(100) | Cognome |
| `is_child` | Boolean | Se è un bambino (utile per menu/sedie) |

### 3. RSVP (Conferma)
Gestisce la risposta e le necessità logistiche del singolo ospite. Relazione 1:1 con Person.

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | UUID | Chiave primaria |
| `person_id` | FK (Person) | Collegamento univoco alla persona |
| `is_attending` | Boolean | Conferma presenza |
| `dietary_requirements` | Text | Allergie o intolleranze |
| `notes` | Text | Note libere |
| `origin_location` | Varchar(255) | Luogo di partenza dichiarato |
| `requires_accommodation`| Boolean | Ha richiesto l'alloggio? (Visibile solo se `Invitation.accommodation_offered=True`) |
| `requires_transfer` | Boolean | Ha richiesto il transfer? (Visibile solo se `Invitation.transfer_offered=True`) |

## Analytics & Logs

### 4. AccessLog
Traccia ogni volta che la pagina dell'invito viene aperta.

| Campo | Tipo | Descrizione |
|---|---|---|
| `invitation_id` | FK (Invitation) | Invito visualizzato |
| `ip_address` | GenericIP | IP del visitatore |
| `user_agent` | Text | Browser/Device info |
| `timestamp` | DateTime | Quando è avvenuto l'accesso |

### 5. InteractionLog
Raccoglie eventi granulari per generare Heatmap e analizzare l'UX.

| Campo | Tipo | Descrizione |
|---|---|---|
| `invitation_id` | FK (Invitation) | Contesto evento |
| `interaction_type` | Varchar(50) | Tipo evento: `click`, `scroll`, `mousemove` |
| `data` | JSON | Payload flessibile (coordinate x/y, viewport, target element) |
| `timestamp` | DateTime | Quando è avvenuto l'evento |
