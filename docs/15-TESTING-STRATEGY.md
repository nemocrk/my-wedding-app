# 🧪 Testing Strategy

> Documentazione ufficiale della strategia di testing per il progetto **My-Wedding-App**.
> Ultimo aggiornamento: 23/01/2026

## 1. Panoramica
Il testing è parte integrante del processo di sviluppo (Regola Aurea #4). Questo documento definisce gli standard, i tool e i processi per garantire la qualità del codice.

### Stack Tecnologico
| Componente | Tool | Versione | Scopo |
|------------|------|----------|-------|
| **Backend** | `pytest` | ^7.0 | Unit & Integration Test Django |
| **Frontend** | `Vitest` | ^4.0 | Unit Test React (veloce, compatibile Jest) |
| **Environment** | `jsdom` | ^27.0 | Emulazione browser per componenti React |
| **Assertions** | `Testing Library` | ^16.0 | Testing comportamentale UI |
| **Coverage** | `v8` | N/A | Analisi copertura codice nativa |

---

## 2. Unit Testing (Frontend Admin)

### Configurazione
La configurazione risiede in `frontend-admin/vitest.config.ts`.
- **Environment**: jsdom
- **Globals**: Attivati (`describe`, `it`, `expect` non richiedono import)
- **Coverage Provider**: v8
- **Alias**: `@` mappa a `./src`

### Comandi
```bash
# Esecuzione singola
cd frontend-admin
npm run test

# Watch mode (sviluppo)
npm run test -- --watch

# Coverage Report
npm run test:coverage
```

### Coverage Thresholds (Strict)
Il fallimento di queste soglie blocca la CI (se configurata):
- **Lines**: 90%
- **Functions**: 90%
- **Statements**: 90%
- **Branches**: 85%

### Moduli Critici Coperti
1. **fetchClient.js**
   - Gestione errori HTTP (4xx, 5xx)
   - Fallback rete
   - Parsing JSON/Text
   - Event emission `api-error`

2. **ToastContext.jsx**
   - Integrazione `react-hot-toast`
   - Custom rendering
   - Metodi API (`success`, `error`, `promise`)

3. **whatsappService.js**
   - Costruzione URL
   - Integrazione fetchClient
   - Gestione parametri query

---

## 3. Best Practices

### Mocks
- **Global**: `fetch`, `window.dispatchEvent` mockati in `setupTests.tsx`.
- **Moduli Esterni**: Mockare sempre librerie terze parti (es. `react-hot-toast`, `lucide-react`) per isolare il test.
- **Dipendenze Interne**: Mockare i service (es. `fetchClient`) quando si testano i consumatori (es. `whatsappService`).

### Struttura Test
Seguire il pattern **AAA**:
1. **Arrange**: Preparare i mock e i dati.
2. **Act**: Eseguire la funzione/componente.
3. **Assert**: Verificare il risultato o il side-effect.

```javascript
describe('ModuleName', () => {
  describe('FunctionName', () => {
    it('should do something specific when condition met', () => {
      // Arrange
      const mockData = { ... };
      
      // Act
      const result = functionToTest(mockData);
      
      // Assert
      expect(result).toBe(true);
    });
  });
});
```

---

## 4. Integration & E2E (Futuro)
- **Integration**: Pianificato testing delle pagine intere con MSW (Mock Service Worker).
- **E2E**: Pianificato Cypress/Playwright per flussi critici (Login, RSVP).

---

## 5. Maintenance
- Eseguire `npm run test` prima di ogni commit.
- Aggiornare i test se la logica di business cambia.
- Mantenere i mock sincronizzati con le API reali.
