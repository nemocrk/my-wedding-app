#!/bin/bash

# Script di automazione per l'esecuzione completa della Test Suite
# Project: My-Wedding-App
# Author: AI DevOps Architect

set -e # Interrompe l'esecuzione se un comando fallisce

# Default values
COVERAGE=false

# Parse arguments
for arg in "$@"
do
    case $arg in
        --coverage)
        COVERAGE=true
        shift
        ;;
    esac
done

echo "========================================================"
echo "🚀 AVVIO TEST SUITE COMPLETA - MY WEDDING APP"
if [ "$COVERAGE" = true ]; then
    echo "📊 MODE: WITH CODE COVERAGE"
fi
echo "========================================================"
echo ""

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
