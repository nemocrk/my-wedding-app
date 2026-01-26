#!/bin/bash

# Script di automazione per l'esecuzione completa della Test Suite
# Project: My-Wedding-App
# Author: AI DevOps Architect

set -e # Interrompe l'esecuzione se un comando fallisce

# Default values
COVERAGE=false
BACKEND=true
USER=true
ADMIN=true
E2E=true
I18N=true
DEFAULT_SUITE=true

# Parse arguments
for arg in "$@"
do
    case $arg in
        --coverage)
        COVERAGE=true
        shift
        ;;
    esac
    case $arg in
        --backend)
        if [ "$DEFAULT_SUITE" = true ]; then
            DEFAULT_SUITE=false
            BACKEND=false
            USER=false
            ADMIN=false
            E2E=false
            I18N=false
        fi
        BACKEND=true
        shift
        ;;
    esac
    case $arg in
        --user)
        if [ "$DEFAULT_SUITE" = true ]; then
            DEFAULT_SUITE=false
            BACKEND=false
            USER=false
            ADMIN=false
            E2E=false
            I18N=false
        fi
        USER=true
        shift
        ;;
    esac
    case $arg in
        --admin)
        if [ "$DEFAULT_SUITE" = true ]; then
            DEFAULT_SUITE=false
            BACKEND=false
            USER=false
            ADMIN=false
            E2E=false
            I18N=false
        fi
        ADMIN=true
        shift
        ;;
    esac
    case $arg in
        --e2e)
        if [ "$DEFAULT_SUITE" = true ]; then
            DEFAULT_SUITE=false
            BACKEND=false
            USER=false
            ADMIN=false
            E2E=false
            I18N=false
        fi
        E2E=true
        shift
        ;;
    esac
    case $arg in
        --i18n)
        if [ "$DEFAULT_SUITE" = true ]; then
            DEFAULT_SUITE=false
            BACKEND=false
            USER=false
            ADMIN=false
            E2E=false
            I18N=false
        fi
        I18N=true
        shift
        ;;
    esac
done

echo "========================================================"
if [ "$DEFAULT_SUITE" = true ]; then
    echo "🚀 AVVIO TEST SUITE COMPLETA - MY WEDDING APP"
else
    echo "🚀 AVVIO TEST SUITE - MY WEDDING APP - TEST INCLUSI:"
fi
if [ "$I18N" = true ]; then
    echo "  --> i18n <--"
fi
if [ "$BACKEND" = true ]; then
    echo "  --> backend <--"
fi
if [ "$USER" = true ]; then
    echo "  --> frontend-user <--"
fi
if [ "$ADMIN" = true ]; then
    echo "  --> frontend-admin <--"
fi
if [ "$E2E" = true ]; then
    echo "  --> E2E Playwright <--"
fi
if [ "$COVERAGE" = true ]; then
    echo "📊 MODE: WITH CODE COVERAGE"
fi
echo "========================================================"
echo ""

if [ "$I18N" = true ]; then
    echo "  --> i18n <--"
    # 0. Static Checks
    echo "--------------------------------------------------------"
    echo "🔍 [0/4] Esecuzione Static Checks (i18n)..."
    echo "--------------------------------------------------------"
    echo "🌐 Verifica allineamento e completezza traduzioni..."
    if [ -f "i18n/scripts/i18n-check.js" ]; then
        node i18n/scripts/i18n-check.js
    else
        echo "⚠️  Script i18n-check.js non trovato. Skipping."
    fi
    echo "✅ Static Checks Completati con successo."
    echo ""
fi

if [ "$BACKEND" = true ]; then
    # 1. Backend Tests
    echo "--------------------------------------------------------"
    echo "🐍 [1/4] Esecuzione Backend Tests (Pytest)..."
    echo "--------------------------------------------------------"
    cd backend

    # Auto-Setup Venv if missing
    if [ ! -d ".venv" ]; then
        echo "⚠️  Virtual environment non trovato. Creazione in corso..."
        python3 -m venv .venv
        source .venv/bin/activate
    else
        echo "⚠️  Virtual environment trovato. Lo attivo..."
        source .venv/bin/activate
    fi

    if [ -f "requirements.txt" ]; then
        echo "📦 Installazione dipendenze..."
        pip install -r requirements.txt
    else
        echo "❌ ERRORE: requirements.txt non trovato!"
        exit 1
    fi

    # Esegui pytest
    echo "🧪 Esecuzione Pytest..."
    if [ "$COVERAGE" = true ]; then
        # Installa pytest-cov se manca
        pip install pytest-cov > /dev/null 2>&1
        pytest -v --cov=core --cov-report=html --cov-report=term
    else
        pytest -v
    fi

    cd ..
    echo "✅ Backend Tests Completati con successo."
    echo ""
fi


if [ "$USER" = true ]; then
    # 2. Frontend User Tests
    echo "--------------------------------------------------------"
    echo "⚛️  [2/4] Esecuzione Frontend User Tests (Vitest)..."
    echo "--------------------------------------------------------"
    cd frontend-user
    # Eseguiamo in modalità CI per evitare che vitest rimanga in watch mode
    echo "📦 Installazione dipendenze Frontend User..."
    npm install
    if [ "$COVERAGE" = true ]; then
        npm run test -- --run --coverage
    else
        npm run test -- --run
    fi
    cd ..
    echo "✅ Frontend User Tests Completati con successo."
    echo ""
fi

if [ "$ADMIN" = true ]; then
    # 3. Frontend Admin Tests
    echo "--------------------------------------------------------"
    echo "🛠️  [3/4] Esecuzione Frontend Admin Tests (Vitest)..."
    echo "--------------------------------------------------------"
    cd frontend-admin
    echo "📦 Installazione dipendenze Frontend Admin..."
    npm install
    if [ "$COVERAGE" = true ]; then
        npm run test -- --run --coverage
    else
        npm run test -- --run
    fi
    cd ..
    echo "✅ Frontend Admin Tests Completati con successo."
    echo ""
fi

if [ "$E2E" = true ]; then
    # 4. E2E Tests
    echo "--------------------------------------------------------"
    echo "🎭 [4/4] Esecuzione E2E Tests (Playwright)..."
    echo "--------------------------------------------------------"
    # Nota: Assumiamo che i container Docker siano attivi o che l'ambiente sia pronto.
    # Se necessario, si può aggiungere un check qui.
    cd tests/e2e
    echo "📦 Installazione dipendenze E2E..."
    npm install
    # Assicuriamoci che i browser siano installati
    npx playwright install chromium
    # Install OS dependencies (requires sudo/root)
    npx playwright install-deps chromium
    npx playwright test
    cd ../..
    echo "✅ E2E Tests Completati con successo."
    echo ""
fi

echo "========================================================"
echo "🎉 TUTTI I TEST SONO PASSATI! IL CODICE È SOLIDO."
if [ "$COVERAGE" = true ]; then
    echo "📊 Report di copertura generati:"
    echo "   - Backend: backend/htmlcov/index.html"
    echo "   - User: frontend-user/coverage/index.html"
    echo "   - Admin: frontend-admin/coverage/index.html"
fi
echo "========================================================"
exit 0