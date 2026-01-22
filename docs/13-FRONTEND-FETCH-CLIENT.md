# Frontend Admin - Fetch Client Architecture

## Overview

Il modulo `fetchClient.js` centralizza tutta la logica di gestione delle richieste HTTP nel frontend-admin, eliminando duplicazioni presenti in `api.js` e `accommodationService.js` e garantendo un comportamento uniforme per:

- **Network errors** (DNS, CORS, timeout)
- **HTTP errors** (4xx, 5xx)
- **Response parsing** (JSON con fallback a text)
- **Global error events** (emissione evento `api-error`)

## Architecture

```
┌─────────────────────────────────────────────┐
│         Service Layer                       │
│  (api.js, accommodationService.js, etc.)   │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│          fetchClient.js                     │
│  ┌──────────────────────────────────────┐  │
│  │  safeFetch()                         │  │
│  │  - Wraps native fetch()              │  │
│  │  - Catches network-level errors      │  │
│  │  - Emits 'api-error' event           │  │
│  └──────────────┬───────────────────────┘  │
│                 │                            │
│                 ▼                            │
│  ┌──────────────────────────────────────┐  │
│  │  handleResponse()                    │  │
│  │  - Parses JSON/text response         │  │
│  │  - Maps HTTP errors to Error objects │  │
│  │  - Emits 'api-error' for 4xx/5xx    │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  Public API:                                │
│  - fetchClient(url, options)                │
│  - fetchClientDelete(url, options)          │
└─────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│      Global Error Handling                  │
│  window.addEventListener('api-error', ...)  │
│  - ErrorBoundary                            │
│  - Toast notifications                      │
│  - Sentry logging (future)                  │
└─────────────────────────────────────────────┘
```

## API Reference

### `fetchClient(url, options)`

Client HTTP generico per richieste GET/POST/PUT/PATCH.

**Signature:**
```javascript
fetchClient(url: string, options?: RequestInit): Promise<any>
```

**Behavior:**
1. Esegue `safeFetch(url, options)` per gestire network errors
2. Passa la response a `handleResponse()` per parsing e HTTP error handling
3. Ritorna i dati parsati (JSON) o `{ detail: text }` per non-JSON responses
4. **Throws** `Error` con proprietà `status` per errori HTTP/Network (dopo emissione evento globale)

**Usage:**
```javascript
import { fetchClient } from './fetchClient.js';

// GET request
const invitations = await fetchClient('/api/admin/invitations/');

// POST request
const newInvitation = await fetchClient('/api/admin/invitations/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John Doe', code: 'ABC123' })
});
```

---

### `fetchClientDelete(url, options)`

Client HTTP specializzato per richieste DELETE che ritornano `204 No Content`.

**Signature:**
```javascript
fetchClientDelete(url: string, options?: RequestInit): Promise<boolean | any>
```

**Behavior:**
- Ritorna `true` per status code `204` (successful deletion)
- Per altri status, delega a `handleResponse()` (stesso comportamento di `fetchClient`)

**Usage:**
```javascript
import { fetchClientDelete } from './fetchClient.js';

const deleted = await fetchClientDelete('/api/admin/accommodations/5/', {
  method: 'DELETE'
});
// deleted === true
```

---

## Error Handling Flow

### 1. Network Errors (DNS, CORS, Timeout)

```javascript
try {
  const response = await fetch(url, options);
} catch (err) {
  const error = new Error("Impossibile contattare il server. Controlla la tua connessione.");
  error.originalError = err;
  window.dispatchEvent(new CustomEvent('api-error', { detail: error }));
  throw error; // Rethrow per gestione locale (opzionale)
}
```

**Result:**
- Global listener riceve l'errore → mostra Toast/Modal "Nessuna connessione"
- Il servizio chiamante può gestire localmente con `catch` se necessario

---

### 2. HTTP Errors (4xx, 5xx)

```javascript
if (!response.ok) {
  const errorMessage = data.detail || data.error || `HTTP Error ${response.status}`;
  const error = new Error(errorMessage);
  error.status = response.status; // Attach HTTP status code
  
  window.dispatchEvent(new CustomEvent('api-error', { detail: error }));
  throw error;
}
```

**Result:**
- Global listener riceve errore con `error.status` → può differenziare:
  - `401` → Redirect a login
  - `403` → Toast "Non autorizzato"
  - `500` → Modal "Errore del server"
- Il servizio chiamante può gestire casi specifici (es. `404` per entity not found)

---

### 3. Success Response (2xx)

```javascript
const contentType = response.headers.get("content-type");
if (contentType && contentType.includes("application/json")) {
  return await response.json();
} else {
  return { detail: await response.text() }; // Fallback for non-JSON
}
```

**Result:**
- Dati ritornati direttamente al chiamante
- Nessun evento emesso

---

## Migration Guide

### Before (api.js - Old)

```javascript
const triggerGlobalError = (error) => { /* ... */ };
const handleResponse = async (response) => { /* ... */ };
const safeFetch = async (url, options) => { /* ... */ };

export const api = {
  fetchInvitations: async () => {
    const response = await safeFetch(`${API_BASE_URL}/invitations/`);
    return handleResponse(response);
  },
  // ...
};
```

### After (api.js - New)

```javascript
import { fetchClient, fetchClientDelete } from './fetchClient.js';

const API_BASE_URL = 'api/admin';

export const api = {
  fetchInvitations: async () => {
    return fetchClient(`${API_BASE_URL}/invitations/`);
  },
  
  deleteInvitation: async (id) => {
    return fetchClientDelete(`${API_BASE_URL}/invitations/${id}/`, {
      method: 'DELETE'
    });
  },
  // ...
};
```

**Benefits:**
- ✅ **Riduzione codice**: -50 righe per file (eliminato boilerplate)
- ✅ **Manutenibilità**: Single source of truth per error handling
- ✅ **Testabilità**: Mock di `fetchClient` invece di mocking `fetch` + helpers
- ✅ **Consistenza**: Stessa UX per errori in tutti i servizi

---

## Testing Strategy

### Unit Tests (fetchClient.js)

```javascript
import { fetchClient, fetchClientDelete, _internal } from './fetchClient.js';

describe('fetchClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    global.window.dispatchEvent = jest.fn();
  });

  it('should parse JSON response for 200 OK', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({ id: 1, name: 'Test' })
    });

    const data = await fetchClient('/api/test');
    expect(data).toEqual({ id: 1, name: 'Test' });
  });

  it('should emit api-error event for 500 HTTP error', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({ detail: 'Internal Server Error' })
    });

    await expect(fetchClient('/api/test')).rejects.toThrow('Internal Server Error');
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'api-error',
        detail: expect.objectContaining({ status: 500 })
      })
    );
  });

  it('should handle network error', async () => {
    global.fetch.mockRejectedValue(new Error('Network failure'));

    await expect(fetchClient('/api/test')).rejects.toThrow(
      'Impossibile contattare il server'
    );
    expect(window.dispatchEvent).toHaveBeenCalled();
  });
});
```

### Integration Tests (Service Layer)

```javascript
import { api } from './services/api.js';
import * as fetchClientModule from './services/fetchClient.js';

jest.mock('./services/fetchClient.js');

describe('api.fetchInvitations', () => {
  it('should return invitations list', async () => {
    fetchClientModule.fetchClient.mockResolvedValue([
      { id: 1, name: 'Invitation 1' },
      { id: 2, name: 'Invitation 2' }
    ]);

    const invitations = await api.fetchInvitations();
    expect(invitations).toHaveLength(2);
    expect(fetchClientModule.fetchClient).toHaveBeenCalledWith('api/admin/invitations/');
  });
});
```

---

## Future Enhancements

### 1. Retry Logic per Network Errors
```javascript
const safeFetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### 2. Request Timeout
```javascript
const fetchWithTimeout = (url, options, timeout = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
};
```

### 3. Request/Response Interceptors (axios-like)
```javascript
const interceptors = {
  request: [],
  response: []
};

export const addRequestInterceptor = (fn) => interceptors.request.push(fn);
export const addResponseInterceptor = (fn) => interceptors.response.push(fn);
```

### 4. Migrazione whatsappService.js
**Post Issue #80**, migrare anche `whatsappService.js` a usare `fetchClient` per completare l'unificazione.

---

## Related Issues

- **#82**: Introdurre fetchClient.js condiviso (questo documento)
- **#80**: Standardizzazione whatsappService (prerequisito per migrazione)
- **#81**: Eliminazione Alert JS (beneficia di error handling unificato)

---

## References

- [MDN Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [Custom Events](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)
- [Error Handling Best Practices](https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript)
