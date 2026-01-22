---
title: "[Frontend] Eliminazione Alert JS e Refactoring UX Errori/Conferme"
labels: ["frontend", "ux", "refactoring"]
assignees: []
---

### Obiettivo
Eliminare l'uso di `alert()` nativi in tutto il progetto `frontend-admin`, sostituendoli con componenti UI moderni (Toast, Modal) e sfruttando la gestione centralizzata degli errori.

### Prerequisiti
*   Completamento issue #[80] (Standardizzazione whatsappService) per garantire che gli errori backend siano gestiti globalmente.

### Piano di Intervento per File

#### 1. `frontend-admin/src/pages/InvitationList.jsx`
*   **`handleVerifyContact`**: ❌ **ELIMINA** il catch block (gestito globalmente da `api.js`).
*   **`handleBulkVerify` (Catch)**: ❌ **ELIMINA** il catch block (gestito globalmente).
*   **`handleBulkVerify` (Success)**: ✅ **SOSTITUISCI** alert con **Toast Success**.
*   **`handleWABulkSend`**: ⚠️ **SOSTITUISCI** alert con **Toast Warning** (validazione input).
*   **`handleSingleSend`**: ⚠️ **SOSTITUISCI** alert con **Toast Warning** (validazione input).

#### 2. `frontend-admin/src/pages/WhatsAppConfig.jsx`
*   **`handleRefresh` (Catch)**: ❌ **ELIMINA** il catch block.
*   **`handleLogout` (Catch)**: ❌ **ELIMINA** il catch block.
*   **`handleTestMessage` (Catch)**: ❌ **ELIMINA** il catch block.
*   **`handleRefresh` (Logico)**: 🛑 **SOSTITUISCI** alert con **Toast Error** o **ErrorModal** (quando status != 'connected').
*   **`handleTestMessage` (Success)**: ✅ **SOSTITUISCI** alert con **Toast Success**.

#### 3. `frontend-admin/src/components/whatsapp/WhatsAppQueueDashboard.jsx`
*   **`handleRetry`**: ❌ **ELIMINA** interamente il catch block.
*   **`handleForceSend`**: ❌ **ELIMINA** interamente il catch block.
*   **`handleDelete`**: ❌ **ELIMINA** interamente il catch block.
*   **`handleSaveEdit`**: ❌ **ELIMINA** interamente il catch block.
*   *(Nota: Se l'operazione richiede feedback visivo locale di errore specifico non bloccante, usare Toast Error, altrimenti lasciare al global handler)*.

#### 4. `frontend-admin/src/components/invitations/CreateInvitationModal.jsx`
*   **`handleSubmit`**: ❌ **ELIMINA** il catch block (gestito globalmente).
*   **`handleNext` (Step 1)**: ⚠️ **SOSTITUISCI** alert con **Toast Warning** ("Nome e Codice obbligatori").
*   **`handleNext` (Step 2)**: ⚠️ **SOSTITUISCI** alert con **Toast Warning** ("Inserire almeno un ospite").

#### 5. `frontend-admin/src/components/config/TextConfigWidget.jsx`
*   **`handleUpdateText`**: ❌ **ELIMINA** il catch block (gestito globalmente).

#### 6. `frontend-admin/src/pages/LabelManager.jsx`
*   **`handleSubmit`**: ❌ **ELIMINA** il catch block (gestito globalmente).

### Note Tecniche
*   Utilizzare una libreria di Toast (es. `react-hot-toast` o esistente nel progetto) per i messaggi di successo e warning.
*   Non implementare nuovi `try/catch` per errori HTTP 4xx/5xx, lasciare che l'evento `api-error` faccia il suo corso.
