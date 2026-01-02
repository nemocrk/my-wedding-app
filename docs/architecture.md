# Architecture & Data Flow

## Network Topology & Isolation

Il sistema utilizza 4 reti Docker distinte per garantire la sicurezza e l'isolamento dei componenti.

### 1. Database Network (`db_network`)
- **Tipo:** Internal (Isolata da Internet e Host, eccetto port mapping espliciti su reti bridge non-internal)
- **Componenti:**
  - `db` (PostgreSQL)
  - `backend` (Django)
  - `adminer` (DB GUI)
- **Scopo:** Permettere al backend e ad Adminer di comunicare con il database. Nessun altro servizio può accedere direttamente al DB.

### 2. Backend Network (`backend_network`)
- **Tipo:** Internal
- **Componenti:**
  - `backend` (Django)
  - `nginx-public`
  - `nginx-intranet`
- **Scopo:** Canale dedicato per i Reverse Proxy per inoltrare le richieste API al container backend.

### 3. Frontend Public Network (`frontend_public_network`)
- **Tipo:** Bridge (Accessibile)
- **Componenti:**
  - `frontend-user` (React Public)
  - `nginx-public`
- **Scopo:** Espone il sito pubblico. `nginx-public` funge da gateway per l'esterno (porte 80/443).

### 4. Frontend Intranet Network (`frontend_intranet_network`)
- **Tipo:** Bridge (Accessibile)
- **Componenti:**
  - `frontend-admin` (React Admin)
  - `nginx-intranet`
  - `adminer`
- **Scopo:** Rete di gestione. Espone i servizi amministrativi (`frontend-admin` su 8080, `adminer` su 8081).

## Diagramma di Flusso Dati

```
[INTERNET USER]
      │
      ▼
[nginx-public] ──────────────┐
      │                      │
      ▼                      ▼
[frontend-user]          [backend] <─── [nginx-intranet] <─── [ADMIN USER]
                             │                                     │
                             ▼                                     │
                           [db] <───────────────────────────── [adminer]
```

## Flussi Specifici

### Analytics (Heatmap)
1.  **Capture:** Utente muove il mouse su `frontend-user`. Event listener JS cattura coordinate (throttled).
2.  **Transport:** Frontend invia batch di coordinate a `POST /api/analytics/track/` via `nginx-public`.
3.  **Storage:** Django riceve su `backend_network` e salva in PostgreSQL via `db_network`.
4.  **Visualize:** Admin richiede dati aggregati `GET /api/analytics/heatmap/{page_id}` via `nginx-intranet`.
5.  **Render:** Admin disegna canvas sopra lo screenshot della pagina.

### Gestione Database
- **Accesso:** Via Adminer (`http://localhost:8081`).
- **Autenticazione:** Adminer si connette al servizio `db` usando le credenziali interne.
- **Isolamento:** Adminer è l'unico punto di accesso visivo al DB; il DB stesso non espone porte all'host.
