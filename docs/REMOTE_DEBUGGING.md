# Remote Debugging Setup - VS Code + Docker

Guida completa per configurare il debug remoto del backend Django in esecuzione dentro un container Docker.

---

## 📋 Prerequisiti

1. **VS Code** con le seguenti estensioni installate:
   - [Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python)
   - [Debugpy](https://marketplace.visualstudio.com/items?itemName=ms-python.debugpy)

2. **Docker** e **Docker Compose** installati e funzionanti

3. Il progetto `my-wedding-app` clonato localmente

---

## 🚀 Setup Rapido

### 1. Build del Container con debugpy

Il file `backend/requirements.txt` include già `debugpy>=1.8.0`. Se hai modificato i requirements, rebuilda il container:

```bash
docker-compose -f docker-compose.yml -f docker-compose.debug.yml up -d --build backend
```

### 2. Avvia lo Stack in Modalità Debug

Il file `docker-compose.debug.yml` è un override che:
- Espone la porta `5678` (debugpy)
- Cambia il comando del backend per lanciare `debugpy` con `--wait-for-client`
- Abilita `DEBUG=True` in Django

**Avvio manuale:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.debug.yml up -d
```

**Verifica che il container sia in attesa:**
```bash
docker-compose logs backend
```

Dovresti vedere:
```
backend    | Listening for debugpy client on 0.0.0.0:5678...
```

### 3. Avvia il Debug in VS Code

1. Apri il progetto in VS Code
2. Vai su **Run and Debug** (Ctrl+Shift+D)
3. Seleziona la configurazione **"Python: Remote Attach (Backend Container)"**
4. Premi **F5** (o clicca su "Start Debugging")

Questo:
- Esegue automaticamente il task `docker-compose-debug-up` (se non già avviato)
- Si connette al debugger sulla porta `5678`
- Inizia ad ascoltare i breakpoint

---

## 🛠️ Configurazioni Disponibili

### File `.vscode/launch.json`

#### 1. **Python: Remote Attach (Backend Container)** ✅ Consigliato
- Lancia automaticamente `docker-compose-debug-up` tramite `preLaunchTask`
- Ideale per workflow completo

#### 2. **Python: Remote Attach (NO preLaunchTask)**
- Si connette senza avviare Docker
- Utile se hai già lanciato manualmente lo stack

### File `.vscode/tasks.json`

Task disponibili (Ctrl+Shift+P → "Tasks: Run Task"):

| Task | Descrizione |
|------|-------------|
| `docker-compose-debug-up` | Avvia lo stack in modalità debug |
| `docker-compose-debug-down` | Ferma lo stack |
| `docker-compose-debug-restart-backend` | Riavvia solo il container backend |
| `docker-compose-debug-logs-backend` | Mostra i log del backend in tempo reale |
| `docker-compose-rebuild-backend` | Rebuilda il backend (dopo modifiche al Dockerfile/requirements) |
| `docker-exec-backend-shell` | Apre una shell bash nel container backend |
| `run-backend-tests` | Esegue i test Django |
| `run-backend-migrations` | Esegue le migrazioni Django |

---

## 🐛 Debugging Workflow

### Esempio: Debug di una View Django

1. **Inserisci un Breakpoint**
   - Apri `backend/core/views/dashboard.py`
   - Clicca sulla linea `stats = {...}` nella funzione `DashboardStatsView.get`
   - Apparirà un pallino rosso sulla sinistra

2. **Avvia il Debug**
   - Premi **F5**
   - Attendi che VS Code si connetta (vedrai "Debugger attached" nella console)

3. **Triggera il Breakpoint**
   - Nel browser, vai su `http://localhost:8080/api/admin/dashboard/stats/`
   - L'esecuzione si fermerà al breakpoint in VS Code

4. **Ispeziona le Variabili**
   - Usa il pannello **Variables** per vedere `self`, `request`, etc.
   - Usa la **Debug Console** per eseguire codice Python live:
     ```python
     >>> stats['guests']
     {'adults_confirmed': 50, ...}
     ```

5. **Step Through del Codice**
   - **F10**: Step Over (esegui la riga corrente)
   - **F11**: Step Into (entra nella funzione chiamata)
   - **Shift+F11**: Step Out (esci dalla funzione corrente)
   - **F5**: Continue (prosegui fino al prossimo breakpoint)

---

## 📁 Path Mappings

Il file `launch.json` usa il seguente mapping:

```json
"pathMappings": [
  {
    "localRoot": "${workspaceFolder}/backend",
    "remoteRoot": "/app"
  }
]
```

- **localRoot**: Cartella `backend/` nel tuo sistema locale
- **remoteRoot**: Cartella `/app` dentro il container (vedi Dockerfile)

Questo permette a VS Code di mappare correttamente i file tra host e container.

---

## ⚠️ Troubleshooting

### Problema: "Debugger failed to attach"

**Soluzione:**
1. Verifica che il container sia in esecuzione:
   ```bash
   docker-compose ps backend
   ```

2. Verifica i log del container:
   ```bash
   docker-compose logs backend
   ```
   Dovresti vedere: `Listening for debugpy client on 0.0.0.0:5678...`

3. Verifica che la porta sia esposta:
   ```bash
   docker-compose port backend 5678
   ```
   Output atteso: `0.0.0.0:5678`

### Problema: Breakpoint ignorati ("Unverified breakpoint")

**Causa**: Path mapping errato tra VS Code e container.

**Soluzione:**
1. Verifica che il file sia dentro `backend/` localmente
2. Controlla che il path nel container sia `/app/...`:
   ```bash
   docker-compose exec backend ls -la /app/core/views/
   ```

### Problema: Django non si avvia dopo aver stoppato il debugger

**Causa**: Il flag `--wait-for-client` blocca Django fino a connessione debugger.

**Soluzione:**
1. Usa il secondo configuration senza `preLaunchTask`
2. Oppure rimuovi `--wait-for-client` dal `docker-compose.debug.yml` (ma perderai la possibilità di debuggare lo startup)

### Problema: Port 5678 già in uso

**Soluzione:**
```bash
# Trova il processo che occupa la porta
lsof -i :5678

# Killa il processo (o cambia porta in docker-compose.debug.yml)
kill -9 <PID>
```

---

## 🔄 Workflow Produzione vs Debug

### Modalità Produzione (Standard)
```bash
docker-compose up -d
```
- Comando: `gunicorn wedding.wsgi:application --bind 0.0.0.0:8000 --workers 4`
- Debug: `False`
- Porta debugger: NON esposta

### Modalità Debug
```bash
docker-compose -f docker-compose.yml -f docker-compose.debug.yml up -d
```
- Comando: `python -m debugpy --listen 0.0.0.0:5678 --wait-for-client manage.py runserver 0.0.0.0:8000`
- Debug: `True`
- Porta debugger: Esposta su `5678`

---

## 📚 Risorse

- [Debugpy Documentation](https://github.com/microsoft/debugpy)
- [VS Code Remote Debugging](https://code.visualstudio.com/docs/python/debugging#_remote-debugging)
- [Docker Compose Override](https://docs.docker.com/compose/extends/)

---

## ✅ Checklist Rapida

- [ ] Estensione Python installata in VS Code
- [ ] `debugpy>=1.8.0` in `backend/requirements.txt`
- [ ] Container rebuildata con `--build`
- [ ] Stack avviato con `docker-compose.debug.yml`
- [ ] Porta `5678` esposta e accessibile
- [ ] Path mapping corretto in `launch.json`
- [ ] Breakpoint inserito in un file `.py` dentro `backend/`
- [ ] Debug session avviata con **F5**

---

**Happy Debugging! 🐞🔍**
