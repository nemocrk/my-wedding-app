# pgBouncer - Connection Pooling PostgreSQL

## Panoramica Architettura

Il progetto **My-Wedding-App** utilizza **pgBouncer** come connection pooler per ottimizzare la gestione delle connessioni tra i worker Gunicorn del backend Django e il database PostgreSQL.

### Problema Risolto

In configurazione multi-worker Gunicorn (4 worker × N connessioni concorrenti), PostgreSQL raggiungeva rapidamente il limite di `max_connections=100` causando l'errore:

```
psycopg2.OperationalError: connection to server at "db" (172.18.0.2), port 5432 failed: 
FATAL: sorry, too many clients already
```

### Soluzione: Architettura con pgBouncer

```
[Gunicorn Workers (4×N requests)] 
          ↓ (fino a 200 connessioni client)
    [pgBouncer Pool]
          ↓ (massimo 25 connessioni attive)
    [PostgreSQL]
```

pgBouncer funge da **proxy intelligente** che:
- Accetta fino a 200 connessioni client (dai worker Django)
- Mantiene un pool di sole 25 connessioni attive verso PostgreSQL
- Rilascia le connessioni dopo ogni transazione (pool mode `transaction`)

---

## Configurazione Parametri

### Variabili Ambiente (docker-compose.yml)

```yaml
environment:
  DATABASES_HOST: db                      # Host PostgreSQL interno
  DATABASES_PORT: 5432
  DATABASES_USER: postgres
  DATABASES_PASSWORD: ${DB_PASSWORD}
  DATABASES_DBNAME: wedding_db
  
  # Pool Configuration
  PGBOUNCER_POOL_MODE: transaction        # Rilascia dopo ogni transazione SQL
  PGBOUNCER_MAX_CLIENT_CONN: 200         # Max connessioni da Django workers
  PGBOUNCER_DEFAULT_POOL_SIZE: 25        # Connessioni attive verso PostgreSQL
  PGBOUNCER_MIN_POOL_SIZE: 5             # Connessioni minime sempre aperte
  PGBOUNCER_RESERVE_POOL_SIZE: 5         # Pool di emergenza per picchi
  PGBOUNCER_SERVER_IDLE_TIMEOUT: 600     # Chiude connessioni idle dopo 10min
```

### Pool Modes Spiegati

| Mode | Descrizione | Use Case |
|------|-------------|----------|
| `transaction` | Rilascia connessione dopo ogni transazione | **Raccomandato** per Django/DRF |
| `session` | Una connessione = una sessione client | Per app con prepared statements |
| `statement` | Rilascia dopo ogni singolo statement SQL | Massima condivisione (rischioso) |

**My-Wedding-App usa `transaction`** perché Django/DRF esegue transazioni atomiche ben definite.

---

## Integrazione Django

### Configurazione Backend (settings.py)

```python
# Database URL punta a pgbouncer (non a db diretto)
DATABASE_URL: postgres://postgres:password@pgbouncer:5432/wedding_db

# Connection pooling Django ottimizzato
DATABASES = {
    'default': dj_database_url.config(
        conn_max_age=60,           # Ridotto da 600s (pgBouncer gestisce persistenza)
        conn_health_checks=True,   # Valida connessioni prima del riuso
    )
}

# In development: nessun pooling Django
if DEBUG:
    DATABASES['default']['CONN_MAX_AGE'] = 0  # Delega a pgBouncer
```

### Perché `CONN_MAX_AGE=0` in Development?

- In debug mode con hot-reload, Django può accumulare connessioni zombie
- pgBouncer gestisce meglio il lifecycle delle connessioni
- Evita leak quando il server Django viene riavviato frequentemente

---

## Monitoraggio e Diagnostica

### 1. Verifica Connessioni PostgreSQL Attive

```bash
# Conta connessioni totali al database
docker exec -it my-wedding-app-db-1 psql -U postgres -d wedding_db -c "
SELECT count(*) AS total_connections, 
       state, 
       application_name 
FROM pg_stat_activity 
GROUP BY state, application_name;
"
```

**Output atteso (con pgBouncer):**
```
 total_connections | state  | application_name 
-------------------+--------+------------------
                25 | active | pgbouncer
                 1 | idle   | psql
```

### 2. Statistiche pgBouncer Pool

```bash
# Connetti alla console admin di pgBouncer
docker exec -it my-wedding-app-pgbouncer-1 psql \
  -h 127.0.0.1 -p 5432 -U postgres -d pgbouncer -c "SHOW POOLS;"
```

**Output esempio:**
```
 database    | cl_active | cl_waiting | sv_active | sv_idle | sv_used | maxwait 
-------------+-----------+------------+-----------+---------+---------+---------
 wedding_db  |        12 |          0 |        15 |       5 |      20 |       0
```

**Legenda:**
- `cl_active`: Client attivi (Django workers)
- `sv_active`: Connessioni server attive verso PostgreSQL
- `sv_idle`: Connessioni server idle (pronte per riuso)
- `maxwait`: Tempo attesa massimo (0 = nessun bottleneck)

### 3. Log Real-Time pgBouncer

```bash
docker logs -f my-wedding-app-pgbouncer-1
```

---

## Troubleshooting

### Errore: "too many clients already" (Post-pgBouncer)

Se l'errore persiste dopo il deploy:

#### Causa 1: Pool Size Sottodimensionato

**Sintomo:** `maxwait > 0` nel comando `SHOW POOLS`

**Soluzione:**
```yaml
# Aumenta DEFAULT_POOL_SIZE in docker-compose.yml
PGBOUNCER_DEFAULT_POOL_SIZE: 50  # Da 25 a 50
```

#### Causa 2: Django CONN_MAX_AGE Troppo Alto

**Sintomo:** Log Django mostra `OperationalError` dopo periodi di inattività

**Soluzione:**
```python
# In settings.py, forza CONN_MAX_AGE=0 anche in produzione
DATABASES['default']['CONN_MAX_AGE'] = 0
```

#### Causa 3: Gunicorn Workers Eccessivi

**Sintomo:** Traffico basso ma molte connessioni attive

**Soluzione:**
```yaml
# In docker-compose.yml, riduci worker Gunicorn
command: gunicorn wedding.wsgi:application --bind 0.0.0.0:8000 --workers 2
```

**Formula Gunicorn workers:**
```
workers = (2 × CPU_cores) + 1
```

Per container Docker con 2 vCPU → 5 workers max.

---

## Tuning Produzione

### Traffic Profiling

| Scenario | Req/sec | Workers Gunicorn | Pool Size pgBouncer |
|----------|---------|------------------|---------------------|
| Basso (inviti matrimonio) | <10 | 2-4 | 10-25 |
| Medio (200 invitati online) | 10-50 | 4-6 | 25-50 |
| Picco (apertura inviti) | 50-100 | 6-8 | 50-75 |

### Health Check pgBouncer

Il health check verifica che pgBouncer possa connettersi a PostgreSQL:

```yaml
healthcheck:
  test: ["CMD", "psql", "-h", "127.0.0.1", "-p", "5432", "-U", "postgres", "-d", "wedding_db", "-c", "SELECT 1"]
  interval: 10s
  timeout: 5s
  retries: 3
```

**Importante:** Il backend dipende sia da `db` che da `pgbouncer` con `condition: service_healthy`.

---

## Sicurezza e Isolamento

pgBouncer è **isolato nella rete `db_network`** insieme a PostgreSQL:

```yaml
networks:
  db_network:
    internal: true  # Nessun accesso Internet
    driver: bridge
```

**Accesso:**
- ✅ Backend Django → pgBouncer → PostgreSQL (interno)
- ✅ Adminer → PostgreSQL (interno)
- ❌ Internet → pgBouncer (isolato)

---

## Testing Connection Pool

### Smoke Test

```bash
# Rebuild completo
docker-compose down -v
docker-compose build --no-cache backend
docker-compose up -d

# Verifica tutti i servizi healthy
docker ps --filter "name=my-wedding-app" --format "table {{.Names}}\t{{.Status}}"
```

### Load Test (Simulazione 100 Richieste Parallele)

```python
# tests/load_test_pgbouncer.py
import requests
from concurrent.futures import ThreadPoolExecutor
import time

def test_auth_endpoint():
    start = time.time()
    response = requests.post(
        "http://localhost/api/public/auth/",
        json={"code": "test-code", "token": "test-token"}
    )
    elapsed = time.time() - start
    return response.status_code, elapsed

with ThreadPoolExecutor(max_workers=50) as executor:
    futures = [executor.submit(test_auth_endpoint) for _ in range(100)]
    results = [f.result() for f in futures]

success = sum(1 for status, _ in results if status in [200, 400])
failed = sum(1 for status, _ in results if status == 500)
avg_time = sum(t for _, t in results) / len(results)

print(f"Success: {success}/100")
print(f"Failed (500): {failed}/100")
print(f"Avg Response Time: {avg_time:.3f}s")
```

**Risultato atteso:**
```
Success: 100/100
Failed (500): 0/100
Avg Response Time: 0.05s
```

---

## Riferimenti

- [pgBouncer Official Documentation](https://www.pgbouncer.org/)
- [Django Database Connection Management](https://docs.djangoproject.com/en/stable/ref/databases/#persistent-connections)
- [Gunicorn Worker Tuning Guide](https://docs.gunicorn.org/en/stable/design.html#how-many-workers)

---

## FAQ

**Q: Posso usare pgBouncer anche per database non PostgreSQL?**  
A: No, pgBouncer supporta solo PostgreSQL. Per MySQL/MariaDB usa ProxySQL.

**Q: pgBouncer supporta SSL verso PostgreSQL?**  
A: Sì, configurabile con `PGBOUNCER_SERVER_TLS_SSLMODE`. Non necessario in rete Docker isolata.

**Q: Quando NON usare pgBouncer?**  
A: Se l'app ha <5 connessioni concorrenti totali o usa prepared statements complessi (usa pool mode `session`).
