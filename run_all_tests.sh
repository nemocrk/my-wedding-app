#!/bin/bash

# Script di automazione per l'esecuzione completa della Test Suite
# Project: My-Wedding-App
# Author: AI DevOps Architect

set -e # Interrompe l'esecuzione se un comando fallisce

#!/bin/bash

# 1. Funzione per caricare NVM nel contesto dello script
load_nvm() {
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
}

# 2. Installazione NVM se manca
if ! [ -d "$HOME/.nvm" ]; then
    echo "NVM non trovato. Installazione in corso..."
    wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi

# Carica NVM ora che siamo sicuri che esista
load_nvm

# 3. Verifica se nvm è pronto, altrimenti esce
if ! command -v nvm &> /dev/null; then
    echo "Errore: Impossibile caricare NVM."
    exit 1
fi

# 4. Recupero versioni (Remota vs Locale)
LTS_REMOTE=$(nvm version-remote --lts)
LTS_LOCAL=$(nvm version lts/* 2>/dev/null | grep -v "N/A" || echo "")

echo "LTS Remota: $LTS_REMOTE | LTS Locale: $LTS_LOCAL"

if [ -z "$LTS_LOCAL" ]; then
    echo "Installazione Node LTS ($LTS_REMOTE)..."
    nvm install --lts
    nvm alias default "lts/*"
elif [ "$LTS_LOCAL" != "$LTS_REMOTE" ]; then
    echo "Aggiornamento Node LTS rilevato ($LTS_LOCAL -> $LTS_REMOTE)..."
    # Installa la nuova e migra i pacchetti globali
    nvm install --lts --reinstall-packages-from=node
    nvm alias default "lts/*"
    # Opzionale: rimuove la vecchia versione
    nvm uninstall "$LTS_LOCAL"
else
    echo "Node.js è già all'ultima versione LTS."
fi

nvm use "lts/*"

#!/bin/bash
export DEBIAN_FRONTEND=noninteractive

# Lista pacchetti necessari
PACKAGES=("python3.12" "python3.12-venv" "python3.12-dev")
MISSING_PACKAGES=()

# 1. Verifica quali pacchetti mancano (senza sudo)
for pkg in "${PACKAGES[@]}"; do
    if ! dpkg -l | grep -q "^ii  $pkg "; then
        MISSING_PACKAGES+=("$pkg")
    fi
done

# 2. Se mancano pacchetti, installa solo quelli
if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
    echo "Pacchetti mancanti rilevati: ${MISSING_PACKAGES[*]}"
    
    # Aggiunge il PPA se necessario (solo se manca il binario python3.12)
    if [[ " ${MISSING_PACKAGES[*]} " =~ " python3.12 " ]]; then
        sudo apt-get update
        sudo apt-get install -y software-properties-common
        sudo add-apt-repository -y ppa:deadsnakes/ppa
    fi

    echo "Installazione in corso..."
    sudo apt-get update
    sudo apt-get install -y "${MISSING_PACKAGES[@]}"
else
    echo "Python 3.12 e accessori (venv, dev) sono già installati."
fi

# 3. Test finale della sottostruttura venv
python3.12 -m venv --help > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Verifica completata: modulo venv operativo."
else
    echo "Errore: il modulo venv non risponde correttamente."
    exit 1
fi


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
    VENV_DIR=".venv"
    # 1. Verifica se la cartella esiste E se contiene il file bin/activate
    if [ ! -f "$VENV_DIR/bin/activate" ]; then
        echo "Ambiente virtuale non trovato o incompleto in $VENV_DIR."
        
        # Rimuove la cartella se esiste ma è corrotta (manca activate)
        [ -d "$VENV_DIR" ] && rm -rf "$VENV_DIR"
        
        echo "Creazione di un nuovo virtual environment..."
        python3.12 -m venv "$VENV_DIR"
        
        if [ $? -eq 0 ]; then
            echo "Virtual environment creato con successo."
        else
            echo "Errore critico nella creazione del venv."
            exit 1
        fi
    else
        echo "Ambiente virtuale presente e pronto."
    fi
    echo "⚠️  Virtual environment trovato. Lo attivo..."
    source .venv/bin/activate
    

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
    # 1. Recupera la lista dei pacchetti APT necessari (dinamico)
    echo "Analisi dipendenze di sistema per Chromium..."
    DEPS=$(npx playwright install-deps --dry-run chromium 2>/dev/null | grep "apt-get install" | sed 's/.*apt-get install -y //')

    if [ -z "$DEPS" ]; then
        echo "Impossibile recuperare la lista delle dipendenze (assicurati di aver fatto npm install)."
    else
        MISSING_PACKAGES=()
        for pkg in $DEPS; do
            if ! dpkg -l | grep -q "^ii  $pkg "; then
                MISSING_PACKAGES+=("$pkg")
            fi
        done

        # 2. Installa le librerie di sistema SOLO se mancano
        if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
            echo "Installazione dipendenze mancanti: ${MISSING_PACKAGES[*]}"
            sudo -n apt-get update && sudo -n apt-get install -y "${MISSING_PACKAGES[@]}"
        else
            echo "Librerie di sistema già presenti."
        fi
    fi

    # 3. Installa Chromium (il browser vero e proprio)
    # Questo comando NON chiede mai sudo e controlla da solo se è già installato
    echo "Verifica binari Chromium..."
    npx playwright install chromium
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