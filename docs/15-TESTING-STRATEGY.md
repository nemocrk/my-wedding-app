# 🧪 Testing Strategy

> Documentazione ufficiale della strategia di testing per il progetto **My-Wedding-App**.
> Ultimo aggiornamento: 24/01/2026

## 1. Panoramica
Il testing è parte integrante del processo di sviluppo (Regola Aurea #4). Questo documento definisce gli standard, i tool e i processi per garantire la qualità del codice.

### Stack Tecnologico
| Componente | Tool | Versione | Scopo |
|------------|------|----------|-------|
| **Backend** | `pytest` | ^8.0 | Unit & Integration Test Django |
| **Frontend** | `Vitest` | ^4.0 | Unit Test React (veloce, compatibile Jest) |
| **Environment** | `jsdom` | ^27.0 | Emulazione browser per componenti React |
| **Assertions** | `Testing Library` | ^16.0 | Testing comportamentale UI |
| **Coverage** | `coverage.py`/`v8` | N/A | Analisi copertura codice |

---

## 2. Code Coverage Policies (Issue #98)

L'intera codebase è soggetta a strict coverage thresholds che bloccano la CI/CD se non rispettati.

### Backend (Django)
- **Tool**: `pytest-cov` / `coverage.py`
- **Config**: `backend/.coveragerc` + `backend/pytest.ini`
- **Soglia Minima**: **85%** Lines
- **Esclusioni**:
  - Migrations (`*/migrations/*`)
  - Config files (`manage.py`, `wsgi.py`, `asgi.py`)
  - Test utilities (`tests/*`, `conftest.py`)
  - Assets statici

### Frontend (User & Admin)
- **Tool**: Vitest (provider `v8`)
- **Config**: `vite.config.js` (`test.coverage`)
- **Soglia Minima**: **80%** Lines
- **Esclusioni**:
  - `node_modules`, `dist`
  - Config (`vite.config.js`, `.eslintrc.cjs`)
  - Bootstrap (`main.jsx`, `index.js`, `i18n.js`)
  - Type definitions (`*.d.ts`)

---

## 3. Frontend Testing (User & Admin)

### Configurazione
La configurazione risiede in `vite.config.js` di ciascun progetto.
- **Environment**: jsdom
- **Globals**: Attivati
- **Coverage Provider**: v8

### Comandi
```bash
# Esecuzione singola
cd frontend-user # o frontend-admin
npm run test

# Watch mode (sviluppo)
npm run test -- --watch

# Coverage Report (Fail under 80%)
npm run test:coverage
```

### Moduli Critici (Admin)
1. **fetchClient.js**
   - Gestione errori HTTP (4xx, 5xx)
   - Fallback rete
2. **ToastContext.jsx**
   - Integrazione `react-hot-toast`
3. **whatsappService.js**
   - Costruzione URL

---

## 4. Backend Testing

### Configurazione
Definita in `backend/pytest.ini` e `backend/.coveragerc`.

### Comandi
```bash
cd backend
# Esecuzione standard con coverage check
pytest

# Report HTML dettagliato
pytest --cov-report=html
```

---

## 5. Best Practices

### Mocks
- **Global**: `fetch`, `window.dispatchEvent` mockati in `setupTests.ts/tsx`.
- **Moduli Esterni**: Mockare sempre librerie terze parti.
- **Dipendenze Interne**: Mockare i service quando si testano i consumatori.

### Struttura Test (AAA)
1. **Arrange**: Preparare i mock e i dati.
2. **Act**: Eseguire la funzione/componente.
3. **Assert**: Verificare il risultato o il side-effect.

---

## 6. Integration & E2E
- **E2E**: Playwright per flussi critici (Login, RSVP).
- **Load Testing**: Script per connection pooling (`pgBouncer`).
