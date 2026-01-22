---
title: "[Frontend] Standardizzare gestione errori in whatsappService.js"
labels: ["bug", "technical-debt", "frontend"]
assignees: []
---

### Contesto
Attualmente `frontend-admin/src/services/api.js` implementa un meccanismo centralizzato di gestione errori tramite `triggerGlobalError`, che emette un evento `api-error` gestito globalmente (es. da una ErrorModal o Toast).

Il file `frontend-admin/src/services/whatsappService.js`, invece, utilizza una gestione errori locale isolata, lanciando semplici eccezioni senza emettere l'evento globale. Questo impedisce di rimuovere i blocchi `try/catch` ridondanti nei componenti (es. `WhatsAppQueueDashboard.jsx`) e frammenta la UX degli errori.

### Obiettivo
Uniformare `whatsappService.js` allo standard di `api.js` per garantire che tutti gli errori di rete e HTTP (4xx/5xx) siano intercettati globalmente.

### Action Items
1.  **Refactoring `whatsappService.js`**:
    *   Implementare (o importare se possibile) la funzione `triggerGlobalError`.
    *   Aggiornare la funzione interna `handleResponse` (o il wrapper delle chiamate) per:
        *   Intercettare status code >= 400.
        *   Chiamare `triggerGlobalError(error)` prima di lanciare l'eccezione.
    *   Gestire gli errori di rete (fetch failed) emettendo anch'essi l'evento globale.

2.  **Verifica**:
    *   Simulare un errore (es. disconnettendo la rete o forzando un 500) chiamando un metodo di `whatsappService`.
    *   Verificare che appaia il componente globale di errore (ErrorModal/Toast) senza bisogno di un `alert()` nel componente chiamante.

### Note Tecniche
*   Prendere ispirazione diretta dall'implementazione in `frontend-admin/src/services/api.js`.
*   Non modificare la firma dei metodi esistenti per mantenere retrocompatibilità.
