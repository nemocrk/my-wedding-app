# Frontend Admin Components (Dashboard)

Questa sezione documenta l'architettura della Dashboard gestionale, sviluppata con React 19, Tailwind CSS v4 e Recharts.

## 1. Struttura Generale

La dashboard è un'applicazione "Intranet-only", accessibile solo via VPN o Tunnel SSH.

- **Routing**: Gestito da React Router.
  - `/dashboard`: KPI e Grafici.
  - `/invitations`: CRUD Inviti.
  - `/accommodations`: Gestione Camere.
  - `/labels` 🆕: Gestione Etichette Inviti.
  - `/whatsapp`: Configurazione e Code Messaggi.
  - `/config`: Prezzi e Testi.
- **Internationalization (i18n)**: Interfaccia completamente localizzata (IT/EN) per permettere l'uso da parte di wedding planner internazionali.

## 2. Pagine Principali (`src/pages/`)

### Dashboard (`Dashboard.jsx`)

Il centro di controllo. Visualizza:

- **KPI Cards**: Totale confermati, Budget stimato, Camere occupate.
- **Grafici**:
  - *RSVP Status* (PieChart): Distribuzione conferme/rifiuti per tutti gli stati (`imported`, `created`, `sent`, `read`, `confirmed`, `declined`).
  - *Dietary Requirements* (BarChart): Istogramma allergie.
- **Logica**: Utilizza `recharts` per la visualizzazione e chiamate API aggregate per le statistiche.

### InvitationList (`InvitationList.jsx`) 🆕

Il cuore operativo con funzionalità avanzate.

- **Visualizzazione Responsive (Switch a `lg` / 1024px)**:
  - **Desktop (`lg:block`)**: Tabella densa con tutte le colonne.
  - **Mobile/Tablet (`lg:hidden`)**: Layout a Card verticali ottimizzato per touch, mostrando solo dati critici e azioni principali.

- **Tabella Dati**: Lista paginata e filtrabile di tutti gli inviti.
  - **Nuova Colonna "Labels"** 🆕: Visualizza badge colorati per ogni etichetta assegnata all'invito.

- **Filtri Avanzati** 🆕:
  - Filtro per **Status** (dropdown con tutti gli stati: `imported`, `created`, `sent`, `read`, `confirmed`, `declined`).
  - Filtro per **Label** (dropdown multi-select).
  - Filtro per **Origine** (`groom`/`bride`).
  - **Search Bar**: Ricerca full-text su nome invito e ospiti.

- **Bulk Selection Mode** 🆕:
  - Checkbox per riga per selezione multipla.
  - **Floating Action Bar** che appare quando ci sono elementi selezionati:
    - **"Invia WhatsApp"**: Apre modal per invio bulk messaggi.
    - **"Verifica Contatti"**: Lancia verifica bulk numeri WhatsApp.
    - **"Applica Label"**: Aggiunge/rimuove label da tutti gli inviti selezionati.
  - **Contatore Selezione**: Mostra "X selezionati" con opzione "Deseleziona tutti".

- **Azioni Rapide (per riga)**:
  - *Copia Link*: Genera URL pubblico con token.
  - *Edit*: Apre modale per modificare composizione nucleo familiare.
  - *Delete*: Rimozione soft/hard (dipende da backend).
  - *WhatsApp Send*: Invio diretto messaggio.
  - *Verify Contact*: Verifica validità contatto WhatsApp.
  - *Pin/Unpin Accommodation* 🆕: Toggle per bloccare/sbloccare assegnazione alloggio automatica.

- **UX**: Feedback immediato (Toast notifications) per ogni azione.

### LabelsPage (`LabelsPage.jsx`) 🆕

Nuova pagina per la gestione centralizzata delle etichette.

- **Features**:
  - **Lista Etichette**: Tabella con preview colore, nome e azioni (Edit, Delete).
  - **CRUD Completo**:
    - **Create**: Modal con form (Nome, Color Picker HEX).
    - **Edit**: Modal precompilata per modifica.
    - **Delete**: Conferma prima della rimozione (warning se label in uso).
  - **Color Picker**: Widget visuale per selezione colori (es. `react-color` o input HTML5 `type="color"`).

- **API Integration**:
  - `GET /api/admin/invitation-labels/`: Lista etichette.
  - `POST /api/admin/invitation-labels/`: Crea etichetta.
  - `PATCH /api/admin/invitation-labels/{id}/`: Aggiorna.
  - `DELETE /api/admin/invitation-labels/{id}/`: Elimina.

### AccommodationsPage (`AccommodationsPage.jsx`) 🆕

Gestione logistica ospitalità con funzionalità avanzate.

- **Visualizzazione Gerarchica**: Struttura → Stanze → Ospiti assegnati.
- **Drag & Drop (Concettuale)**: Interfaccia per spostare ospiti tra stanze (implementata tramite dropdown/modal selection).
- **Indicatori Capacità**: Progress bar per occupazione stanze (Adulti/Bambini).
- **Pin Icon** 🆕: Ogni invito assegnato mostra un'icona "pin" per bloccare/sbloccare l'assegnazione automatica:
  - **Pinned** (icona solida): L'invito non sarà spostato dall'algoritmo di auto-assegnazione.
  - **Unpinned** (icona outline): L'invito può essere riassegnato automaticamente.
- **Modal Modifica Alloggio** 🆕: Permette di cambiare nome/indirizzo della struttura senza ricrearla.

### Supplier Types & Suppliers (`SupplierTypesPage.jsx`, `SuppliersPage.jsx`) 🆕

- **SupplierTypesPage**:
  - CRUD semplice per i tipi di fornitore (es. Catering, Fotografia, Fiori).
  - Tabella con `name`, `description` e azioni `Edit` / `Delete`.

- **SuppliersPage**:
  - Tabella/lista paginata con colonne: `Name`, `Type`, `Cost`, `Currency`, `Contact`, `Actions`.
  - Mobile-first: Card verticali per dispositivi < `lg` con le stesse informazioni e azioni principali (Edit/Delete).
  - Filtri: `type`, `min_cost`, `max_cost`, `search`.
  - Bulk actions: selezione multipla e cancellazione.
  - Form Create/Edit con validazione client-side (`cost >= 0`) e mask per valuta.

- **Integrazione Dashboard**:
  - La Dashboard (`/dashboard`) mostra ora una voce `Fornitori` nel `Cost Breakdown` con il totale e il dettaglio (lista o collapsed view) dei principali fornitori.
  - La card `Total cost` include la somma dei costi `Suppliers` insieme ai costi esistenti (meals, accommodation, transfer).

### Configuration (`Configuration.jsx`)

Pannello "Live Settings" per il Singleton `GlobalConfig`.

- **Form Gestione**: Permette di modificare prezzi e testi senza redeploy.
- **Configurazione Testi (CMS)**: Nuova sezione per modificare i contenuti dinamici dell'app ospite.

#### Widget CMS (`TextConfigWidget`)

Componente avanzato per la gestione dei `ConfigurableText`.

- **Features**:
  - Lista testi raggruppati per categoria (`home`, `cards`, `rsvp`).
  - Search bar per trovare rapidamente i testi.
  - Preview del contenuto.
  - Modale di modifica con **Rich Text Editor**.

## 3. Servizi API (`src/services/`)

### `api.js`

Client HTTP principale.

- **Interceptors**: Aggiunge automaticamente il cookie di sessione (CSRF/SessionID) per autenticazione Django.
- **Gestione Errori**: Reindirizza al login se riceve 401/403.
- **Nuovi Metodi CMS**:
  - `fetchConfigurableTexts()`
  - `getConfigurableText(key)`
  - `updateConfigurableText(key, content)`
- **Nuovi Metodi Labels** 🆕:
  - `fetchInvitationLabels()`
  - `createInvitationLabel(data)`
  - `updateInvitationLabel(id, data)`
  - `deleteInvitationLabel(id)`
- **Nuovi Metodi Bulk** 🆕:
  - `bulkSendWhatsApp(invitation_ids, template_id)`
  - `bulkVerifyContacts(invitation_ids)`
  - `bulkApplyLabels(invitation_ids, label_ids, action)` (action: 'add' | 'remove')

### `accommodationService.js`

Servizio specializzato per la logistica.

- **Metodi**: `getAvailability()`, `assignRoom(guestId, roomId)`, `pinAccommodation(invitationId)` 🆕.
- **Logica Client-Side**: Spesso arricchisce i dati grezzi con calcoli di capacità residua prima di passarli ai componenti.

## 4. Componenti UI (`src/components/`)

L'interfaccia è costruita su componenti modulari stylati con Tailwind.

- **Common**: `Button`, `Input`, `Modal`, `Badge` 🆕 (wrapper accessibili).
- **Layout**:
  - `Sidebar`: Navigazione fissa visibile solo da **XL (1280px)** in su. Include voce "Labels" 🆕.
  - `Header`: Burger menu visibile fino a XL. Include **LanguageSwitcher**.
- **Analytics**: Wrapper per i grafici Recharts per garantire consistenza di colori e font.
- **Config**:
  - `TextConfigWidget`: Widget principale CMS.
  - `ConfigurableTextEditor`: Editor WYSIWYG basato su TipTap.
- **Labels** 🆕:
  - `LabelBadge`: Componente riutilizzabile per visualizzare badge colorati.
  - `LabelSelector`: Multi-select creatable per assegnazione label (basato su `react-select`).
  - `ColorPicker`: Widget per selezione colori HEX.
- **Invitations** 🆕:
  - `BulkActionBar`: Floating bar per azioni massive (appare quando ci sono elementi selezionati).
  - `InvitationFilters`: Pannello filtri avanzati (Status, Label, Origin, Search).
- **WhatsApp**:
  - `QueueTable`: Componente per la visualizzazione dei messaggi in coda.
  - **Responsive Layout**: Dual view con switch a **LG (1024px)**.
- **Accommodations** 🆕:
  - `PinToggle`: Icona interattiva per pin/unpin assegnazione alloggio.
  - `EditAccommodationModal`: Form per modifica struttura esistente.

## 5. Design Responsive & Pattern Dual View

### Strategia Implementativa

Per garantire usabilità su tutti i dispositivi, i componenti con tabelle dense adottano il **pattern Dual View** con breakpoints asimmetrici:

1. **Layout Generale (`xl` / 1280px)**:
   - Sidebar fissa solo su schermi molto larghi per garantire spazio al contenuto principale.
   - Sotto i 1280px, la sidebar collassa in un Burger Menu nell'header.

2. **Tabelle Dati (`lg` / 1024px)**:
   - **Desktop View**: Tabella completa visibile sopra i 1024px.
   - **Mobile View**: Card verticali visibili sotto i 1024px (Tablet/Laptop piccoli).

### Componenti Responsive

- **InvitationList**: Tabella desktop + Card mobile con selezione, info ospiti, badge labels e azioni rapide.
- **LabelsPage**: Tabella desktop + Card mobile con preview colore inline.
- **QueueTable (WhatsApp)**: Tabella messaggi desktop + Card mobile con anteprima testo inline (senza tooltip).

### Breakpoint Tailwind Custom

- **`lg:` (1024px)**: Soglia per switch Tabelle/Cards.
- **`xl:` (1280px)**: Soglia per switch Sidebar/Menu.

## 6. Gestione Asset Grafici

L'applicazione segue uno standard rigoroso per la gestione delle immagini e delle icone per garantire performance e manutenibilità.

### Struttura Directory

- `src/assets/icons/`: Icone UI riutilizzabili (es. `react-logo.svg`).
- `src/assets/illustrations/`: Illustrazioni complesse (es. `sad-face.svg` per messaggi di errore).
- `public/`: Asset statici serviti direttamente (es. `vite.svg`, favicon) che non richiedono bundling.

### Standard di Implementazione

1. **Icone UI**: Utilizzare preferibilmente la libreria `lucide-react` per coerenza stilistica (es. `<X />`, `<Loader />`, `<Pin />` 🆕).
2. **Import SVG**: Per file custom, importare l'URL o il componente React:

   ```javascript
   // Metodo Immagine (Preferito per illustrazioni complesse)
   import sadFaceUrl from '../../assets/illustrations/sad-face.svg';
   <img src={sadFaceUrl} alt="Error" className="w-20 h-20" />
   ```

3. **Vietato**: Non inserire SVG inline (`<svg>...</svg>`) direttamente nel codice JSX dei componenti per evitare "pollution" del codice.

## 7. i18n Best Practices 🆕

### Regola Zero Hardcoded Strings

Ogni nuovo componente DEVE rispettare:

- **UI Statica**: Tutte le label, placeholder, messaggi di errore devono usare `useTranslation()` hook.
- **Formato Chiavi**: Seguire la convenzione `admin.pageName.componentName.labelKey` (es. `admin.labels.create_modal.name_label`).
- **File i18n**: Le traduzioni vanno in `/i18n/it.json` e `/i18n/en.json`, mai inline nel codice.

### Esempio Corretto

```javascript
import { useTranslation } from 'react-i18next';

function CreateLabelModal() {
  const { t } = useTranslation();
  
  return (
    <Modal title={t('admin.labels.create_modal.title')}>
      <Input 
        label={t('admin.labels.form.name')} 
        placeholder={t('admin.labels.form.name_placeholder')} 
      />
    </Modal>
  );
}
```

### Esempio Errato (Vietato)

```javascript
// ❌ MAI FARE COSÌ
function CreateLabelModal() {
  return (
    <Modal title="Nuova Etichetta">  {/* HARDCODED! */}
      <Input label="Nome" />           {/* HARDCODED! */}
    </Modal>
  );
}
```

## Flusso Operativo Tipico

1. Admin accede a `/invitations`.
2. Crea un nuovo invito "Famiglia Rossi" (Create Modal).
3. Assegna label "VIP" e "Colleghi" tramite multi-select 🆕.
4. Copia il link generato (API call `get_token`).
5. Seleziona multipli inviti con label "Colleghi" e clicca "Invia WhatsApp" 🆕.
6. Monitora l'apertura su `/dashboard` (Real-time analytics).
7. Gestisce alloggi su `/accommodations` e blocca assegnazione per inviti VIP con pin 🆕.

## Legenda Simboli 🆕

- 🆕 = Novità introdotte nelle issues #51-54 del branch `feature/inviti-labels-bulk-alloggi`.
