# Miglioramento UX Intolleranze Alimentari

**Data:** 21/01/2026
**Autore:** DevOps Team (AI)
**Issue:** #71

## Panoramica
Implementazione di un set di miglioramenti per la gestione delle intolleranze e allergie alimentari, sia lato ospite (Frontend User) che lato sposi (Frontend Admin e Backend).

## Modifiche Implementate

### 1. Backend (Django)
*   **Auto-Tagging:** Implementato un signal (`auto_assign_dietary_label`) su `post_save` del modello `Person`.
    *   Quando un ospite salva delle intolleranze, l'invito riceve automaticamente l'etichetta "Intolleranze" (Rosso #FF6B6B).
    *   Se le intolleranze vengono rimosse da tutti gli ospiti di un invito, l'etichetta viene rimossa automaticamente.
    *   **File:** `backend/core/signals.py`

### 2. Frontend Admin
*   **Visual Indicators:** Aggiunta icona "Posate" (🍽️ `Utensils` da Lucide React) rossa accanto al nome dell'ospite nella lista inviti principale.
    *   Tooltip nativo HTML con il dettaglio delle intolleranze.
    *   **File:** `frontend-admin/src/pages/InvitationList.jsx`

### 3. Frontend User (RSVP)
*   **UX Hints:** Aggiunto un testo esplicativo (*"Clicca sulla matita per modificare..."*) nello Step 1 del wizard RSVP.
*   **CSS Refactor:** Spostati gli stili inline in classi CSS dedicate (`.guest-hint`, `.guest-dietary-label`) e risolto bug di layout input/textarea.
    *   **File:** `frontend-user/src/components/invitation/LetterContent.jsx`, `LetterContent.css`

## Testing
*   **Backend:** Unit test in `backend/core/tests/test_signals_dietary.py` coprono i casi di aggiunta, rimozione e persistenza multi-ospite.
*   **Frontend:** Unit test in `frontend-user/src/components/invitation/__tests__/LetterContent.test.jsx` verificano la presenza dell'hint.

## Note per il Deployment
*   Eseguire `pytest` per verificare le regressioni backend.
*   Verificare che le nuove chiavi di traduzione (`rsvp.hints.edit_guest_hint`) siano presenti in tutti i file locale (IT/EN).
