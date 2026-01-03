# Backend API (Views & Serializers)

Questa sezione documenta come i dati vengono trasformati (Serializer) ed esposti (Views) tramite Django REST Framework.

## 1. Serializers (`backend/core/serializers.py`)

### Serializers Pubblici
Utilizzati per l'interfaccia ospite, con un set ridotto di campi per privacy.
- **`PublicInvitationSerializer`**: Include un campo calcolato `letter_content` che renderizza dinamicamente il testo di benvenuto usando placeholder (`{family_name}`, `{code}`) configurati nel database.
- **`PublicPersonSerializer`**: Mostra solo nome, cognome e flag bambino.

### Serializers Amministrativi
Gestiscono CRUD completi per il pannello di controllo.
- **`InvitationSerializer`**: Gestisce relazioni nested complesse in fase di creazione/aggiornamento:
    - **Guests**: Logica di sync (crea nuovi, aggiorna esistenti, cancella mancanti) preservando l'assegnazione stanze (`assigned_room`).
    - **Affinities**: Gestione automatica della simmetria nelle relazioni ManyToMany (se A piace a B, B piace ad A).
- **`AccommodationSerializer`**: Include logica per creazione/aggiornamento massivo delle stanze (`rooms_config`). Calcola dinamicamente la capacità totale e residua.
- **`RoomDetailSerializer`**: Espone il metodo `available_slots()` del modello per mostrare in tempo reale quanti posti (Adulti/Bambini) sono liberi.

## 2. Gestione ViewSet
Le API sono divise logicamente in due namespace.

### Namespace `/api/public/`
- **Autenticazione**: Mista.
    - `GET /invitation/{code}`: Aperta (rate-limited).
    - `POST /rsvp`: Richiede Token HMAC o sessione valida.
- **Permessi**: ReadOnly per la maggior parte, Write solo su campi specifici (`status`, `dietary_requirements`).

### Namespace `/api/admin/`
- **Autenticazione**: SessionAuthentication (richiede login Django standard).
- **Permessi**: `IsAdminUser`.
- **Logica Bulk**: Endpoint ottimizzati per dashboard (`InvitationListSerializer` con `prefetch_related` per evitare query N+1).

## Flusso Dati Complesso
### Aggiornamento RSVP
1. Il frontend invia un payload JSON con lo stato di ogni ospite.
2. `InvitationSerializer.update()` intercetta la richiesta.
3. I dati degli ospiti vengono iterati: se l'ID esiste, si aggiorna il record `Person`; se manca, si crea.
4. Vengono ricalcolati i totali per accommodation e transfer.
5. Viene emesso un segnale (se configurato) per notificare gli sposi via email/Telegram.

### Assegnazione Alloggi
L'assegnazione è a doppio livello:
1. **Invito → Struttura (`Accommodation`)**: Definisce DOVE dorme il gruppo.
2. **Ospite → Stanza (`Room`)**: Definisce IN QUALE CAMERA dorme il singolo.
Il serializer `PersonSerializer` gestisce il campo `assigned_room` come FK nullable, permettendo flessibilità (es. assegnare solo la struttura senza specificare ancora la camera).
