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
    └── layout/
        └── Sidebar.test.jsx
```

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
```

## Continuous Integration
I test vengono eseguiti automaticamente su ogni push tramite GitHub Actions:
- ✅ Backend: pytest con coverage
- ✅ Frontend Admin: vitest
- ✅ Frontend User: vitest
- ✅ Smoke tests: container build verification

## Best Practices
1. **Naming**: Test names descriptive (es. `test_invitation_status_changes_on_first_visit`)
2. **Isolation**: Ogni test deve essere indipendente (no shared state)
3. **AAA Pattern**: Arrange, Act, Assert
4. **Factories over Fixtures**: Prefer factory functions for complex objects
5. **Mock External Services**: Sempre mock chiamate HTTP esterne (es. WhatsApp API)
