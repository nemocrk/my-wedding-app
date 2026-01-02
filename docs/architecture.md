# Architecture & Data Flow

## Network Isolation
1.  **Public Network:** Accessibile da internet. Espone solo Nginx (porte 80/443).
2.  **Frontend Network:** Nginx comunica con il container `frontend-user`.
3.  **Internal Backend Network:** Rete isolata.
    - `frontend-user` (Server Side) -> NON accede qui. Il browser client chiama Nginx -> Nginx proxia a Backend.
    - `frontend-admin` -> Risiede qui o ha accesso privilegiato.
    - `backend` -> Risiede qui.
    - `db` -> Risiede qui. Accessibile SOLO da `backend`.

## Flusso Heatmap
1.  **Capture:** Utente muove il mouse su `frontend-user`. Event listener JS cattura coordinate (throttled).
2.  **Transport:** Frontend invia batch di coordinate a `POST /api/analytics/track/`.
3.  **Storage:** Django salva in PostgreSQL (Tabella ottimizzata o TimescaleDB).
4.  **Visualize:** `frontend-admin` richiede dati aggregati `GET /api/analytics/heatmap/{page_id}`.
5.  **Render:** Admin disegna canvas sopra lo screenshot della pagina.