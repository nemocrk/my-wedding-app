# Architettura del Sistema

## Panoramica
Il progetto "My-Wedding-App" è un'applicazione web moderna basata su microservizi, progettata per gestire inviti di matrimonio, conferme (RSVP) e analytics. L'infrastruttura è completamente dockerizzata per garantire portabilità, isolamento e scalabilità.

## Diagramma dei Componenti

```mermaid
graph TD
    User(Utente Pubblico) -->|HTTPS/443| NginxPublic
    Admin(Admin Intranet) -->|SSH Tunnel/8080| NginxIntranet

    subgraph "Docker Network: frontend_public"
        NginxPublic[Nginx Gateway] -->|Proxy /| FEUser[Frontend User]
    end

    subgraph "Docker Network: frontend_intranet"
        NginxIntranet[Nginx Intranet] -->|Proxy /| FEAdmin[Frontend Admin]
        NginxIntranet -->|Proxy /adminer| Adminer[Adminer DB GUI]
        NginxIntranet -->|Proxy /api/whatsapp| WAIntegration[WhatsApp Layer]
    end

    subgraph "Docker Network: backend (Internal)"
        NginxPublic -->|Proxy /api/public| Backend[Django API]
        NginxIntranet -->|Proxy /api/admin| Backend
        Backend -->|Queue Check| WAWorker[Django Worker]
    end

    subgraph "Docker Network: whatsapp_intranet (Isolated)"
        WAIntegration -->|Proxy API| WAHAGroom[WAHA Sposo]
        WAIntegration -->|Proxy API| WAHABride[WAHA Sposa]
        WAWorker -->|Send Msg| WAIntegration
    end

    subgraph "Docker Network: db (Isolated)"
        Backend -->|SQL| PgBouncer[PgBouncer]
        PgBouncer -->|Pool| DB[(PostgreSQL)]
        Adminer -->|SQL| DB
        WAWorker -->|SQL| PgBouncer
    end
```

## Servizi Core

### 1. Gateway (Nginx)
Il sistema utilizza due istanze Nginx distinte per separare fisicamente il traffico pubblico da quello amministrativo:
- **nginx-public**: Gestisce il traffico internet in ingresso. Serve il Frontend User (React) e proxa le chiamate API pubbliche (`/api/public/`) al backend.
- **nginx-intranet**: Gestisce il traffico interno (bind su `127.0.0.1`). Serve il Frontend Admin (React), Adminer e le API amministrative (`/api/admin/`).

### 2. Backend (Django)
Il cuore logico dell'applicazione. Espone due set di API distinti:
- **Public API**: Endpoint read-only o limited-write (es. RSVP) protetti da token HMAC o sessioni temporanee.
- **Admin API**: Endpoint completi per la gestione inviti, accessibili solo dalla rete Intranet.

### 3. Frontend (React + Vite)
Due Single Page Application (SPA) separate:
- **User App**: Focalizzata su UX/UI emozionale (`framer-motion`), mobile-first.
- **Admin App**: Dashboard gestionale (`tailwindcss`, `recharts`) per monitorare statistiche e inviti.

### 4. Database (PostgreSQL)
Il database è isolato in una rete Docker dedicata (`db_network`) e non è mai esposto direttamente, nemmeno agli altri container frontend. Solo `backend` e `adminer` possono comunicare con esso.

### 5. WhatsApp Integration Module
Un sottosistema dedicato alla gestione della comunicazione via WhatsApp, progettato per evitare il ban dei numeri personali:
- **WAHA Containers**: Due istanze separate (Sposo/Sposa) di WhatsApp HTTP API.
- **Integration Layer**: Microservizio Node.js che funge da proxy e simula il comportamento umano (typing, pause).
- **Queue Worker**: Processo background Django che gestisce la coda di invio messaggi rispettando i rate limits.
- **Network Isolation**: I servizi WhatsApp risiedono in una rete dedicata (`whatsapp_intranet_network`) accessibile solo dal Backend e dal layer di integrazione.
