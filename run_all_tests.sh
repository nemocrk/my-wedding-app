#!/bin/bash

# Script di automazione per l'esecuzione completa della Test Suite
# Project: My-Wedding-App
# Author: AI DevOps Architect

set -e # Interrompe l'esecuzione se un comando fallisce

echo "========================================================"
echo "🚀 AVVIO TEST SUITE COMPLETA - MY WEDDING APP"
echo "========================================================"
echo ""

# 1. Backend Tests
echo "--------------------------------------------------------"
echo "🐍 [1/4] Esecuzione Backend Tests (Pytest)..."
echo "--------------------------------------------------------"
cd backend
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi
# Esegui pytest con output verboso ridotto ma mostrando i progressi
pytest -v
cd ..
echo "✅ Backend Tests Completati con successo."
echo ""

# 2. Frontend User Tests
echo "--------------------------------------------------------"
echo "⚛️  [2/4] Esecuzione Frontend User Tests (Vitest)..."
echo "--------------------------------------------------------"
cd frontend-user
# Eseguiamo in modalità CI per evitare che vitest rimanga in watch mode
npm run test -- --run
cd ..
echo "✅ Frontend User Tests Completati con successo."
echo ""

# 3. Frontend Admin Tests
echo "--------------------------------------------------------"
echo "🛠️  [3/4] Esecuzione Frontend Admin Tests (Vitest)..."
echo "--------------------------------------------------------"
cd frontend-admin
npm run test -- --run
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
npx playwright test
cd ../..
echo "✅ E2E Tests Completati con successo."
echo ""

echo "========================================================"
echo "🎉 TUTTI I TEST SONO PASSATI! IL CODICE È SOLIDO."
echo "========================================================"
exit 0
