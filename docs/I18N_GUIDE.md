# Internationalization (i18n) Developer Guide

Questa guida tecnica descrive come gestire le traduzioni e l'internazionalizzazione nel progetto **My Wedding App**.

## 1. Architettura
Il progetto utilizza `react-i18next` sia per `frontend-user` che per `frontend-admin`.
- **Backend**: `i18next-http-backend` per caricare i file JSON in modo asincrono.
- **Detector**: `i18next-browser-languagedetector` per rilevare la lingua del browser.
- **Storage**: I file di traduzione risiedono nella root del monorepo (`/i18n/`) e vengono serviti staticamente da Nginx.

### Struttura File
```
/
├── i18n/
│   ├── it.json  (Source of Truth - Italiano)
│   ├── en.json  (Traduzione Inglese)
│   └── scripts/ (Utility scripts)
```

## 2. Aggiungere Nuove Traduzioni

### Workflow Standard
1. **Identificare la stringa**: Trova il testo hardcoded nel componente React.
2. **Creare la chiave**: Scegli una chiave gerarchica descrittiva.
   - Esempio: `components.rsvpModal.confirmButton`
3. **Aggiornare JSON**:
   - Aggiungi la chiave in `i18n/it.json` con il testo italiano.
   - Aggiungi la chiave in `i18n/en.json` con la traduzione inglese.
4. **Utilizzare nel Componente**:
   ```javascript
   import { useTranslation } from 'react-i18next';
   
   const MyComponent = () => {
     const { t } = useTranslation();
     return <button>{t('components.rsvpModal.confirmButton')}</button>;
   };
   ```

### Convenzioni Naming Chiavi
- **camelCase**: Usa camelCase per le chiavi.
- **Gerarchia**: `contesto.componente.elemento`.
  - `home.hero.title`
  - `admin.dashboard.stats.totalGuests`
  - `common.actions.save`

## 3. Gestione Plurali e Interpolazione

### Interpolazione (Variabili)
```json
// it.json
"welcomeUser": "Ciao {{name}}, benvenuto!"
```
```javascript
t('welcomeUser', { name: 'Mario' }) // -> "Ciao Mario, benvenuto!"
```

### Plurali
```json
// it.json
"guestCount_one": "Hai {{count}} ospite",
"guestCount_other": "Hai {{count}} ospiti"
```
```javascript
t('guestCount', { count: 1 }) // -> "Hai 1 ospite"
t('guestCount', { count: 5 }) // -> "Hai 5 ospiti"
```

## 4. Strumenti di Scansione

Il progetto include uno script per identificare stringhe hardcoded mancanti.

### Eseguire lo Scanner
```bash
# Dalla root del progetto
./i18n/scripts/scan_repo.sh frontend-admin
# oppure
./i18n/scripts/scan_repo.sh frontend-user
```
Lo script analizza il codice React e segnala eventuali stringhe letterali non wrappate in `t()`.

> **Nota**: Lo scanner ignora file di test, node_modules e stringhe puramente numeriche/simboliche.

## 5. Deployment e Nginx

In produzione, i file JSON devono essere accessibili via HTTP.
Il Dockerfile di Nginx è configurato per montare la cartella `/i18n` e servirla all'endpoint `/i18n/`.

**Verifica Configurazione Nginx:**
```nginx
location /i18n/ {
    alias /usr/share/nginx/html/i18n/;
    add_header Access-Control-Allow-Origin *;
}
```
Assicurarsi che dopo ogni build/deploy i file JSON siano copiati correttamente nel container Nginx.
