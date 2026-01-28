# 🧪 Testing Strategy - My-Wedding-App

## Overview
La test-suite di My-Wedding-App è organizzata su tre livelli:
1. **Unit Tests** - Modelli, serializer, utility functions
2. **Integration Tests** - API endpoints, authentication flows
3. **E2E Tests** - User journeys critici (es. apertura busta animata)

## Backend Testing

### Struttura
```
backend/core/tests/
├── __init__.py
├── conftest.py              # Fixtures pytest condivise
├── test_models.py           # Test modelli Django
├── test_serializers.py      # Test serializer DRF
├── test_api_public.py       # Test API pubbliche
├── test_api_admin.py        # Test API admin
├── test_assignment_logic.py # Logica business assegnazione camere
├── test_invitation_contact_info.py  # WhatsApp/SMS integration
└── test_smoke.py            # Smoke tests deployment
```

### Esecuzione Test Backend
```bash
# All tests
docker-compose exec backend pytest

# Specific file
docker-compose exec backend pytest core/tests/test_serializers.py

# With coverage
docker-compose exec backend pytest --cov=core --cov-report=html
```

### Coverage Goals
- **Models**: 95%+
- **Serializers**: 90%+
- **Views/API**: 85%+
- **Business Logic**: 100%

## Frontend Testing

### Frontend Admin
```
frontend-admin/src/__tests__/
├── Dashboard.test.jsx
├── pages/
│   └── Configuration.test.jsx     # Form validation
├── services/
│   └── api.test.js                # API client tests
├── whatsapp/
│   ├── QueueTable.test.jsx
│   ├── useWhatsAppSSE.test.jsx
│   └── WhatsAppQueueDashboard.test.jsx
└── components/
    ├── analytics/
    │   └── InteractionsModal.test.jsx
    ├── layout/
    │   └── Sidebar.test.jsx
    └── config/
        ├── ConfigurableTextEditor.integration.test.jsx
        ├── ConfigurableTextEditor.units.test.jsx
        └── ConfigurableTextEditor.menubar.test.jsx
```

### ConfigurableTextEditor - Test Coverage Deep Dive

Il componente `ConfigurableTextEditor` è uno dei più complessi del progetto per via dell'integrazione con Tiptap e delle custom extensions. La strategia di testing è suddivisa in **3 file** per garantire copertura completa:

#### 1. Integration Tests (`ConfigurableTextEditor.integration.test.jsx`)
**Scopo**: Testare il componente nel suo insieme con minimal mocking
- ✅ Rendering preview card con HTML content
- ✅ Apertura/chiusura modal editor
- ✅ Body scroll lock quando editor è aperto
- ✅ Salvataggio contenuto e gestione errori
- ✅ Inizializzazione TipTap editor con content
- ✅ Interazione toolbar (bold, italic, underline, alignment)
- ✅ Rendering GoogleFontPicker, color picker, spinners
- ✅ Attributi ARIA per accessibilità

**Minimal Mocks**:
- `react-i18next` (solo per traduzione chiavi)
- `fontLoader.autoLoadFontsFromHTML` (spy, non mock)

#### 2. Unit Tests (`ConfigurableTextEditor.units.test.jsx`)
**Scopo**: Testare logica isolata di componenti e extensions

**NumberSpinner Component**:
- ✅ Increment/Decrement con click
- ✅ Wheel scroll up/down (preventDefault per evitare scroll pagina)
- ✅ Rispetto boundaries (min/max)
- ✅ Rounding float values (2 decimali)
- ✅ Event listener cleanup on unmount

**FontSize Extension**:
- ✅ Global attributes setup
- ✅ parseHTML (strip quotes da style)
- ✅ renderHTML (genera style o empty object)
- ✅ Comandi setFontSize/unsetFontSize

**Rotation Mark Extension**:
- ✅ parseHTML (estrazione angolo da transform)
- ✅ renderHTML (genera inline-block con rotate)
- ✅ getAttrs (filter span con/senza rotate)
- ✅ Comandi setRotation/unsetRotation (zero angle = unset)

**Editor Paste Handler Logic**:
- ✅ Detect HTML in clipboardData
- ✅ Validate HTML con DOMParser
- ✅ Insert HTML se valido, altrimenti default paste

#### 3. MenuBar Tests (`ConfigurableTextEditor.menubar.test.jsx`)
**Scopo**: Testare sincronizzazione stato editor ↔ toolbar

**Font Size Spinner**:
- ✅ Increment/Decrement con boundaries (0.5-8rem)
- ✅ Wheel scroll interaction

**Rotation Spinner**:
- ✅ Increment/Decrement con boundaries (-180° to 180°)

**Color Picker**:
- ✅ Cambio colore via input event
- ✅ Sync color from selection state

**Font Family State Sync**:
- ✅ Default font (Open Sans)
- ✅ Update quando selection cambia
- ✅ cleanFontName (strip quotes)

**Toolbar Button States**:
- ✅ Active class quando formattazione è attiva
- ✅ Sync su selectionUpdate event
- ✅ Sync su transaction event

**FontSize Conversion**:
- ✅ px → rem conversion (24px = 1.5rem)
- ✅ Fallback quando unit mancante

**Additional Formatting**:
- ✅ Strikethrough toggle
- ✅ Code inline toggle
- ✅ Justify alignment

### Frontend User
```
frontend-user/src/__tests__/
└── e2e/
    └── EnvelopeAnimation.test.jsx  # Critical path E2E
```

### Esecuzione Test Frontend
```bash
# Admin tests
cd frontend-admin && npm run test

# User tests
cd frontend-user && npm run test

# With UI
npm run test:ui

# Coverage
npm run test:coverage

# Watch mode for ConfigurableTextEditor
npm run test -- ConfigurableTextEditor --watch
```

## Continuous Integration
I test vengono eseguiti automaticamente su ogni push tramite GitHub Actions:
- ✅ Backend: pytest con coverage
- ✅ Frontend Admin: vitest
- ✅ Frontend User: vitest
- ✅ Smoke tests: container build verification

## Best Practices

### General
1. **Naming**: Test names descriptive (es. `test_invitation_status_changes_on_first_visit`)
2. **Isolation**: Ogni test deve essere indipendente (no shared state)
3. **AAA Pattern**: Arrange, Act, Assert
4. **Factories over Fixtures**: Prefer factory functions for complex objects
5. **Mock External Services**: Sempre mock chiamate HTTP esterne (es. WhatsApp API)

### Frontend-Specific
6. **Minimal Mocking**: Mock solo ciò che non può essere testato realmente (i18n, external APIs)
7. **User-Centric**: Usa `@testing-library/user-event` per simulare interazioni reali
8. **Accessibility**: Testa attributi ARIA e navigazione keyboard
9. **Split Complex Tests**: Suddividi test suite grandi in file tematici (integration/unit/menubar)
10. **Test Edge Cases**: Boundaries, error states, event listener cleanup

## Coverage Reporting

### Backend
```bash
docker-compose exec backend pytest --cov=core --cov-report=html
open backend/htmlcov/index.html
```

### Frontend Admin
```bash
cd frontend-admin
npm run test:coverage
open coverage/index.html
```

### Target Coverage
- **Backend**: 90%+ statement coverage
- **Frontend Admin**: 85%+ (complessi componenti UI)
- **Frontend User**: 95%+ (critical envelope animation path)

## Debugging Tests

### Backend
```bash
# Run with pdb
docker-compose exec backend pytest --pdb

# Verbose output
docker-compose exec backend pytest -vv
```

### Frontend
```bash
# UI mode (recommended)
npm run test:ui

# Debug specific test
DEBUG_PRINT_LIMIT=0 npm run test -- ConfigurableTextEditor.integration --run

# Browser mode (for complex interactions)
npx vitest --browser
```
