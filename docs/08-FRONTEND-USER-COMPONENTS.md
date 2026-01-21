# Frontend User Components

Questa sezione descrive i componenti principali dell'applicazione **Frontend User**, dedicata agli invitati.

## 📦 Struttura Componenti

### `LetterContent.jsx`

Componente core che gestisce l'esperienza della "Busta Digitale".

**Funzionalità:**
- **Animazione Busta:** Gestisce l'apertura e la rotazione della busta (Flip Card).
- **Contenuto Dinamico:** Recupera i testi configurabili dal backend (`TextContext`).
- **Gestione RSVP:** Wizard multi-step per confermare la presenza.

**Wizard RSVP Flow:**
1.  **Summary:** Riepilogo stato attuale (se già risposto).
2.  **Guests:**
    - Lista ospiti associati all'invito.
    - Possibilità di escludere ospiti che non parteciperanno.
    - **Modifica Anagrafica:** L'utente può correggere Nome/Cognome.
    - **Dietary Requirements:** (NEW) L'utente può specificare intolleranze o allergie per ogni ospite.
3.  **Contact:** Inserimento/Verifica numero di telefono (obbligatorio).
4.  **Travel:** Scelta mezzo di trasporto (Aereo/Traghetto) e orari.
5.  **Accommodation:** (Opzionale) Richiesta alloggio se offerto dagli sposi.
6.  **Final:** Riepilogo finale e invio dati al backend.

**Stato & Props:**
- `data`: Oggetto `Invitation` recuperato dall'API.
- `rsvpStatus`: Stato locale sincronizzato con il backend (`confirmed`, `declined`, `pending`).
- `heatmapTracker`: Tracciamento interazioni utente per analytics.

---

### `PaperModal.jsx`

Componente wrapper per le "Card" che escono dalla busta.
- Stile "carta antica".
- Gestione chiusura e transizioni.

### `Fab.jsx` (Floating Action Button)

Bottone flottante per azioni rapide.
- **Funzione Principale:** Ruotare la busta (Fronte/Retro).
- **Visibilità:** Nascosto quando una card è espansa.

---

## 🎨 Styling

Lo stile segue il tema "Rustic/Vintage".
- **Font:** Gestiti globalmente in `index.css`.
- **Colori:** Palette definita in variabili CSS.
- **Responsive:** Layout adattivo per Mobile (< 768px) e Desktop.

## 🛠 Testing

I componenti sono testati con `Jest` e `React Testing Library`.
- **Unit Test:** Verifica renderizzazione e logica condizionale.
- **Integration Test:** Simulazione flusso RSVP completo.

Vedi `src/__tests__/` per i file di test specifici.