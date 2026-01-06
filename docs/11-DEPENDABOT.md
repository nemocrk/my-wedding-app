# 11 - Dependabot Configuration

## Overview

Dependabot è un bot nativo di GitHub che monitora automaticamente le dipendenze del repository e crea Pull Request per aggiornarle quando vengono rilasciate nuove versioni. Questo garantisce che il progetto rimanga sicuro e aggiornato riducendo il carico di lavoro manuale.

## Configurazione Attuale

### File: `.github/dependabot.yml`

Il file di configurazione Dependabot monitora 7 ecosistemi di pacchetti distribuiti nelle varie componenti del monorepo:

#### 1. GitHub Actions
- **Ecosystem**: `github-actions`
- **Directory**: `/` (root del repository)
- **Frequenza**: Settimanale
- **Grouping**: Tutti gli aggiornamenti delle actions raggruppati in una singola PR
- **Scope**: Aggiorna le versioni delle GitHub Actions utilizzate nei workflow CI/CD

#### 2. Backend Python (Pip)
- **Ecosystem**: `pip`
- **Directory**: `/backend`
- **Frequenza**: Settimanale
- **Grouping**: Tutte le dipendenze Python raggruppate in una singola PR
- **Scope**: Monitora `requirements.txt` per aggiornamenti di Django, DRF, pytest, ecc.

#### 3. Frontend User (Npm)
- **Ecosystem**: `npm`
- **Directory**: `/frontend-user`
- **Frequenza**: Settimanale
- **Grouping**: Tutte le dipendenze npm raggruppate in una singola PR
- **Scope**: Monitora `package.json` e `package-lock.json` per React, Vite, Framer Motion, ecc.

#### 4. Frontend Admin (Npm)
- **Ecosystem**: `npm`
- **Directory**: `/frontend-admin`
- **Frequenza**: Settimanale
- **Grouping**: Tutte le dipendenze npm raggruppate in una singola PR
- **Scope**: Monitora `package.json` e `package-lock.json` per React, Recharts, Heatmap.js, ecc.

#### 5-7. Docker Base Images
- **Ecosystem**: `docker`
- **Directory**: `/backend`, `/frontend-user`, `/frontend-admin`
- **Frequenza**: Settimanale (per ogni componente)
- **Scope**: Aggiorna le immagini base nei Dockerfile:
  - Backend: `python:3.11-slim`
  - Frontend User/Admin: `node:20-alpine` e `nginx:alpine`

## Funzionamento

### Ciclo di Vita delle PR Dependabot

1. **Scansione Settimanale**: Ogni lunedì mattina (fuso orario UTC), Dependabot esegue una scansione delle dipendenze.

2. **Identificazione Aggiornamenti**: Il bot confronta le versioni correnti con i registry ufficiali (PyPI, npm, Docker Hub, GitHub).

3. **Creazione PR**: Se trova aggiornamenti disponibili, crea automaticamente una Pull Request con:
   - Titolo descrittivo (es. "Bump django from 4.2.1 to 4.2.2")
   - Changelog del pacchetto aggiornato
   - Note di compatibilità e breaking changes
   - Link alla release note ufficiale

4. **Esecuzione CI/CD**: La PR triggera automaticamente il workflow GitHub Actions definito in `test-automation.yml`:
   - Backend unit tests
   - Frontend unit tests
   - E2E tests (Playwright)

5. **Merge Manuale o Auto-Merge**: 
   - **Manuale (Raccomandato)**: Review del developer per verificare compatibilità
   - **Auto-Merge (Opzionale)**: Configurabile tramite GitHub rules per patch/minor updates

### Gestione Security Vulnerabilities

Dependabot crea **immediatamente** (senza attendere lo schedule settimanale) una PR se rileva vulnerabilità di sicurezza (CVE) nelle dipendenze. Queste PR hanno priorità CRITICA e devono essere revisionate e mergiate con urgenza.

**Indicatori di Priorità**:
- 🔴 **CRITICAL**: CVE score ≥ 9.0 (merge immediato richiesto)
- 🟠 **HIGH**: CVE score 7.0-8.9 (merge entro 24h)
- 🟡 **MEDIUM**: CVE score 4.0-6.9 (merge entro 7 giorni)
- 🟢 **LOW**: CVE score < 4.0 (merge con prossimo batch)

## Integrazione con CI/CD

### Pipeline di Verifica

Ogni PR Dependabot esegue automaticamente:

1. **Linting**: ESLint (frontend), Flake8/Black (backend)
2. **Type Checking**: TypeScript (frontend)
3. **Unit Tests**: pytest (backend), Jest/RTL (frontend)
4. **E2E Tests**: Playwright su stack Docker completo
5. **Build Verification**: Docker build di tutte le immagini

### Status Checks Obbligatori

Prima del merge, la PR deve passare:
- ✅ Backend tests (copertura ≥ 85%)
- ✅ Frontend User tests (copertura ≥ 75%)
- ✅ Frontend Admin tests (copertura ≥ 75%)
- ✅ E2E tests (tutti gli happy paths)
- ✅ Docker build (no error log)

## Best Practices

### Revisione delle PR Dependabot

#### Aggiornamenti Patch (0.0.X)
- **Rischio**: Basso
- **Azione**: Review veloce del changelog + merge se CI green
- **Esempio**: `react 18.2.0 → 18.2.1`

#### Aggiornamenti Minor (0.X.0)
- **Rischio**: Medio
- **Azione**: Review changelog + test manuali su feature critiche
- **Esempio**: `django 4.2.0 → 4.3.0`
- **Focus**: Nuove funzionalità deprecate, API changes

#### Aggiornamenti Major (X.0.0)
- **Rischio**: Alto
- **Azione**: 
  1. Review completa del migration guide
  2. Test estensivi locali (unit + E2E)
  3. Verifica compatibilità con tutte le dipendenze
  4. Aggiornamento documentazione interna
- **Esempio**: `vite 4.5.0 → 5.0.0`
- **Nota**: Considerare di creare un branch dedicato per testing esteso

### Grouping Strategy

**Vantaggi del Grouping**:
- Riduce il numero di PR (da ~20 individuali a ~5 raggruppate)
- Semplifica la review (context switch ridotto)
- Evita conflitti di merge tra dipendenze correlate

**Svantaggi**:
- Se una dipendenza nel gruppo causa failure, tutta la PR fallisce
- Bisogna identificare manualmente quale pacchetto specifico causa problemi

**Strategia Raccomandata**:
- Mantenere grouping per dipendenze stabili (React, Django LTS)
- Considerare PR separate per pacchetti sperimentali o early-stage

## Configurazione Avanzata (Opzionale)

### Auto-Merge per Patch Updates

Per automatizzare completamente gli aggiornamenti patch (richiede GitHub Pro/Team):

```yaml
# Aggiungi in .github/dependabot.yml sotto ogni ecosystem:
open-pull-requests-limit: 10
pull-request-branch-name:
  separator: "/"
reviewers:
  - "nemocrk"
labels:
  - "dependencies"
  - "automerge"
```

Poi crea una GitHub Action per auto-merge:

```yaml
# .github/workflows/dependabot-automerge.yml
name: Dependabot Auto-Merge
on: pull_request

jobs:
  automerge:
    if: github.actor == 'dependabot[bot]'
    runs-on: ubuntu-latest
    steps:
      - name: Approve PR
        run: gh pr review --approve "$PR_URL"
        env:
          PR_URL: ${{github.event.pull_request.html_url}}
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
      
      - name: Enable auto-merge
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{github.event.pull_request.html_url}}
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

### Ignore Specific Dependencies

Per bloccare aggiornamenti di pacchetti specifici:

```yaml
# In .github/dependabot.yml
updates:
  - package-ecosystem: "npm"
    directory: "/frontend-user"
    schedule:
      interval: "weekly"
    ignore:
      - dependency-name: "react"
        versions: ["19.x"]  # Ignora React 19.x fino a stabilizzazione
```

### Custom Schedule

Per ambienti ad alta frequenza di aggiornamento:

```yaml
schedule:
  interval: "daily"  # Invece di "weekly"
  time: "03:00"      # Specifica orario UTC
```

## Monitoring e Reportistica

### Dashboard Dependabot

Accedi a: `https://github.com/nemocrk/my-wedding-app/security/dependabot`

**Metriche Disponibili**:
- Numero dipendenze outdated
- Vulnerabilità aperte per severità
- Tempo medio di risoluzione PR
- Percentuale di aggiornamenti applicati

### Alerts Slack/Email (Opzionale)

Configura notifiche per PR critiche:

1. **GitHub Settings** → **Notifications** → **Dependabot alerts**
2. Abilita email per CRITICAL/HIGH severity
3. Integra webhook Slack per notifiche real-time:

```bash
# .github/workflows/dependabot-notify.yml
on:
  pull_request:
    types: [opened]

jobs:
  notify:
    if: github.actor == 'dependabot[bot]'
    runs-on: ubuntu-latest
    steps:
      - name: Slack Notification
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🤖 Dependabot PR: ${{ github.event.pull_request.title }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*PR:* <${{ github.event.pull_request.html_url }}|${{ github.event.pull_request.title }}>"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Troubleshooting

### Dependabot non crea PR

**Causa Comune**: `dependabot.yml` con errori di sintassi  
**Fix**: Valida il file YAML:
```bash
# Usa GitHub CLI
gh api repos/nemocrk/my-wedding-app/vulnerability-alerts

# Oppure valida manualmente su:
https://www.yamllint.com/
```

### PR Dependabot fallisce CI

**Causa**: Breaking change non gestito  
**Fix**:
1. Clona il branch Dependabot localmente:
   ```bash
   git fetch origin
   git checkout dependabot/npm_and_yarn/frontend-user/react-19.0.0
   ```
2. Esegui test locali e identifica il problema
3. Committa fix direttamente sul branch Dependabot
4. Il CI rieseguirà automaticamente

### Conflitti di Merge

**Causa**: Base branch (`main`) aggiornato dopo apertura PR  
**Fix**: Dependabot risolve automaticamente conflitti semplici. Per conflitti complessi:
```bash
# Rebase manuale
git checkout dependabot/...
git rebase main
git push --force-with-lease
```

### Troppi PR Aperti

**Causa**: `open-pull-requests-limit` non configurato  
**Fix**: Aggiungi limit in `dependabot.yml`:
```yaml
open-pull-requests-limit: 5  # Max 5 PR contemporanee per ecosystem
```

## Metriche di Successo

### KPI Monitorati

| Metrica | Target | Rationale |
|---|---|---|
| **Tempo medio PR review** | < 48h | Velocità aggiornamento sicurezza |
| **% PR auto-mergiate** | > 60% | Efficienza automazione |
| **CVE aperti HIGH+** | 0 | Postura sicurezza |
| **Uptime Dependabot** | 99.5% | Affidabilità servizio GitHub |
| **Copertura dipendenze** | 100% | Tutti i `package.json`/`requirements.txt` monitorati |

### Report Mensile

Genera report con GitHub CLI:
```bash
gh pr list --author "dependabot[bot]" --state merged --json number,title,mergedAt --jq 'group_by(.mergedAt | split("T")[0]) | map({date: .[0].mergedAt | split("T")[0], count: length})'
```

## Conclusione

Dependabot è un componente critico della strategia DevSecOps del progetto. La configurazione settimanale groupata bilancia:
- **Sicurezza**: Aggiornamenti tempestivi delle vulnerabilità
- **Stabilità**: Batch testing riduce regressioni
- **Produttività**: Review concentrate riducono context switching

Per domande o problemi, consultare la [documentazione ufficiale Dependabot](https://docs.github.com/en/code-security/dependabot).
