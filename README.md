# My Wedding App Monorepo

Un sistema completo per la gestione degli inviti di matrimonio, con RSVP digitale, gestione alloggi e dashboard amministrativa.

## 📚 Documentazione Completa (Obbligatoria)
La documentazione tecnica risiede nella cartella `/docs`. **Consultare prima di ogni modifica.**

| File | Descrizione |
|---|---|
| [**01-ARCHITECTURE.md**](docs/01-ARCHITECTURE.md) | Panoramica del sistema, Docker, Reti e Flusso Dati. |
| [**02-DATABASE.md**](docs/02-DATABASE.md) | Schema ER, Modelli e Relazioni SQL. |
| [**03-BACKEND.md**](docs/03-BACKEND.md) | Struttura progetto Django e convenzioni. |
| [**04-FRONTEND.md**](docs/04-FRONTEND.md) | Overview tecnologica React (User & Admin). |
| [**05-DEVOPS.md**](docs/05-DEVOPS.md) | Configurazione Nginx, Docker Compose e CI/CD. |
| [**06-BACKEND-CORE.md**](docs/06-BACKEND-CORE.md) | Deep Dive su Business Logic e Models. |
| [**07-BACKEND-API.md**](docs/07-BACKEND-API.md) | Serializers, Views e Autenticazione API. |
| [**08-FRONTEND-USER.md**](docs/08-FRONTEND-USER-COMPONENTS.md) | Componenti e Logica App Pubblica. |
| [**09-FRONTEND-ADMIN.md**](docs/09-FRONTEND-ADMIN-COMPONENTS.md) | Componenti e Logica Dashboard Gestionale. |

## 🚀 Quick Start

### Requisiti
- Docker & Docker Compose
- Node.js (per sviluppo locale frontend)
- Python 3.12 (per sviluppo locale backend)

### Avvio (Produzione Simulata)
```bash
# 1. Clona il repo
git clone https://github.com/nemocrk/my-wedding-app.git
cd my-wedding-app

# 2. Configura variabili d'ambiente (copia esempio)
cp .env.example .env

# 3. Avvia i container
docker-compose up --build -d
```

### Sviluppo con AI
Se utilizzi Copilot o Continue, leggi le istruzioni in `.github/copilot-instructions.md` e `.continue/system_prompt.md`.
**Regola d'oro**: Ogni modifica al codice richiede l'aggiornamento della documentazione corrispondente.
