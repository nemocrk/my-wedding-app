# 06. Backend Core: Business Logic & Models

Questo documento dettaglia la logica di business centrale del progetto, inclusi i modelli dati, i flussi automatici e le regole di assegnazione.

## 1. Modelli Dati (ER Esteso)

Il modulo `core` è il cuore dell'applicazione e gestisce le seguenti entità principali:

### GlobalConfig (Singleton)
- Gestisce configurazioni dinamiche come prezzi (pasti, alloggio), testi standard e toggle funzionalità.
- **Link Secret:** Contiene `invitation_link_secret` usato per firmare i link pubblici.

### Invitation (Invito)
Entità principale che raggruppa una famiglia o gruppo.
- **Status:** `created`, `sent` (email/wa inviato), `read` (landing visitata), `confirmed` (RSVP sì), `declined` (RSVP no).
- **Origin:** Distingue lato Sposo (`groom`) vs Sposa (`bride`) per routing messaggi WhatsApp.
- **Affinities:** Relazione molti-a-molti ricorsiva per indicare gruppi amici (usato dall'algoritmo di assegnazione stanze).

### Person (Invitato)
Singolo membro di un invito.
- **is_child:** Flag booleano per calcolo costi e assegnazione posti letto.
- **assigned_room:** Collegamento diretto alla stanza specifica (risultato dell'algoritmo di assegnazione).

### Accommodation & Room
Struttura gerarchica per la logistica.
- `Accommodation`: Hotel o B&B.
- `Room`: Stanza con capacità specifica (adulti/bambini).

## 2. Automazione e Workflow (Signals)

Il sistema implementa logiche reattive tramite Django Signals (`backend/core/signals.py`) per automatizzare la comunicazione.

### Trigger Cambio Stato (`Invitation.status`)
Quando lo stato di un invito cambia (es. da `sent` a `read` o da `read` a `confirmed`), il sistema:
1.  Verifica se esiste un `WhatsAppTemplate` attivo con `condition='status_change'` e `trigger_status` corrispondente al nuovo stato.
2.  Se esiste, genera un messaggio personalizzato sostituendo i placeholder:
    - `{name}`: Nome invito (es. Famiglia Rossi)
    - `{code}`: Codice invito
    - `{link}`: Link pubblico autologin
    - `{guest_names}`: Lista nomi ospiti
3.  Accoda il messaggio in `WhatsAppMessageQueue` per l'invio asincrono.

### Auto-Mark as Read
Quando viene registrata la prima analytics di tipo `visit` su un invito in stato `sent`:
- L'API `PublicLogInteractionView` aggiorna automaticamente lo stato a `read`.
- Questo triggera a cascata il signal di cui sopra (se configurato un template per lo stato `read`).

## 3. Analytics e Tracking

### GuestInteraction
Traccia eventi puntuali:
- `visit`: Caricamento pagina (landing page).
- `click_cta`: Click su bottoni (RSVP, Mappa, ecc).
- `rsvp_submit`: Invio form.

### GuestHeatmap
Registra movimenti del mouse e interazioni touch per sessione utente. Dati salvati in JSON per replay sessione in Admin.

## 4. Algoritmo Assegnazione Stanze

Vedi `AccommodationViewSet.auto_assign` in `views.py`.
Implementa diverse strategie (Space Optimizer, Affinity Cluster, Children First) per allocare automaticamente gli ospiti nelle stanze disponibili, rispettando vincoli di capacità e affinità.
