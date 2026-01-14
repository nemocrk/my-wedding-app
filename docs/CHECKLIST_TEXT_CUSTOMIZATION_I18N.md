# 📋 CHECKLIST: Text Customization & i18n Implementation

---

## 📜 **COME UTILIZZARE QUESTA CHECKLIST**

### **🔴 REGOLE AUREE (Inviolabili)**

#### **1. NON ESEGUIRE MAI COMMIT SU BRANCH MAIN**
Tutti i commit devono essere fatti sul branch `feat/text-customization-i18n`. Il merge su `main` avverrà solo dopo il completamento della FASE 8 e approval della Pull Request.

#### **2. PRIMA DI OGNI `create_or_update_file`, ESEGUIRE `get_file_contents`**
Per garantire che le modifiche partano dall'ultima versione committata ed evitare sovrascritture accidentali, **SEMPRE**:
1. Leggere il file esistente con `get_file_contents`
2. Analizzare il contenuto attuale
3. Applicare le modifiche evolutive (non riscrivere da zero)
4. Eseguire `create_or_update_file` con il SHA ottenuto dal `get_file_contents`

**Esempio**:
```bash
# 1. PRIMA: Leggi il file
get_file_contents(path="backend/core/models.py", ref="feat/text-customization-i18n")

# 2. Analizza il contenuto e prepara le modifiche

# 3. POI: Aggiorna il file con il SHA ottenuto
create_or_update_file(
  path="backend/core/models.py", 
  sha="<SHA_FROM_GET_FILE_CONTENTS>",
  content="<EVOLVED_CONTENT>"
)
```

#### **3. ASSESSMENT TOTALE DEL REPOSITORY**
Prima di proporre qualsiasi soluzione, eseguire una scansione completa dei file interessati. Devi analizzare:
- File visibili (es. `models.py`, `views.py`, `LetterContent.jsx`)
- File nascosti (es. `.env.example`, `.gitignore`, file in `.github`)
- Dockerfile e configurazioni Nginx se la modifica tocca il deployment

#### **4. EVOLUZIONE INCREMENTALE (Strictly No-Rewriting)**
È **VIETATO** riscrivere moduli esistenti da zero. Devi:
1. Leggere la versione attuale committata nel repository
2. Evolvere quel codice specifico mantenendo lo stile e la coerenza del progetto
3. Applicare solo le modifiche necessarie (approccio evolutivo, non rivoluzionario)

**Esempio CORRETTO**:
```python
# File esistente: backend/core/models.py
class Invitation(models.Model):
    # ... codice esistente ...

# AGGIUNGERE alla fine del file:
class ConfigurableText(models.Model):
    # ... nuovo modello ...
```

**Esempio SBAGLIATO** (❌):
```python
# Riscrivere TUTTO il file da zero
from django.db import models

# Reinventare tutti i modelli esistenti
class Invitation(models.Model):
    # ... riscrittura completa ...
```

#### **5. ALLINEAMENTO DOCUMENTALE & MARKDOWN**
Ogni modifica al codice **DEVE** aggiornare simultaneamente:
- I file Markdown nella cartella `/docs` (es. `docs/02-DATABASE.md`, `docs/06-BACKEND-CORE.md`)
- Il `README.md` principale o `AI_RULES.md` se cambiano i protocolli
- La documentazione delle API (es. `docs/API_DOCUMENTATION.md`) se modifichi gli endpoint
- **QUESTA CHECKLIST** (vedi sezione "Aggiornamento Checklist" sotto)

---

### **🔄 AGGIORNAMENTO DELLA CHECKLIST**

#### **Quando Aggiornare Questa Checklist**
Questa checklist **DEVE** essere aggiornata ad ogni completamento di attività:

**✅ Ad ogni task completato**:
1. Spuntare il checkbox corrispondente: `- [ ]` → `- [x]`
2. Aggiornare la sezione "Status" in fondo al documento
3. Aggiornare la data "Last Updated"
4. Committare l'aggiornamento con messaggio descrittivo:
   ```bash
   git commit -m "docs: update checklist - completed FASE X.Y <task_description>"
   ```

**📅 Formato del commit per aggiornamento checklist**:
```
docs: update checklist - completed FASE <N>.<M> <breve_descrizione>

Examples:
- docs: update checklist - completed FASE 0.1 i18n JSON structure
- docs: update checklist - completed FASE 1.1 ConfigurableText model
- docs: update checklist - completed FASE 3.3 LetterContent refactoring
```

**🔍 Tracking Progress**:
Utilizza la sezione "Status" in fondo al documento per tracciare:
- Fase corrente
- Task completati / Totali
- Blocchi o issues
- Prossimo step

**Esempio di Status Update**:
```markdown
**Last Updated**: 2026-01-14 15:30 CET
**Status**: 🟢 In Progress - FASE 0
**Progress**: 4/4 tasks completed in FASE 0.1
**Current Task**: FASE 0.2 - Setup i18n in Frontend-User
**Blockers**: None
**Next Step**: Install react-i18next dependencies
```

---

### **🧑‍💻 CHI LAVORA SU QUESTA FEATURE**

Questa checklist è la **guida operativa condivisa** per chiunque lavori su questa feature:
- **Sviluppatori**: seguire l'ordine delle fasi e spuntare i task completati
- **Reviewer**: verificare che ogni task completato sia effettivamente implementato e testato
- **PM/Lead**: monitorare il progress e identificare blocchi

**Principio chiave**: 
> "La checklist è sempre sincronizzata con lo stato reale del codice. Se un task è spuntato, il codice corrispondente è committato e funzionante."

---

## 🎯 **STRATEGIA ARCHITETTURALE**

### **Divisione delle Responsabilità**

#### **1. Widget Dinamico (Database-Driven)**
Gestisce **contenuti lunghi e specifici del matrimonio** configurabili da frontend-admin:
- **Front della Busta** (testo completo della prima pagina)
- **Content delle Card** (6 card: Alloggio, Viaggio, Evento, Dress Code, Bottino, Cos'altro)

**Caratteristiche**:
- Editore WYSIWYG/Rich Text con preview
- Configurazione stile per parola/frase:
  - Font (serif, sans-serif, monospace, cursive, fantasy)
  - Dimensione (h1, h2, h3, h4, p, small)
  - Colore (color picker)
  - Emoji picker integrato
- Salvato in DB PostgreSQL (`ConfigurableText` model)
- API Backend Django per CRUD
- Preview real-time in frontend-admin

#### **2. i18n Statico (JSON-Based)**
Gestisce **tutti i label, pulsanti, messaggi di validazione, UI text**:
- Configurazione in file JSON statici condivisi tra frontend-user e frontend-admin
- Libreria: `react-i18next`
- Lingue supportate: **Italiano (IT)** e **Inglese (EN)**
- File JSON nella root del monorepo: `/i18n/`
- Language switcher in entrambe le app

---

## 📦 **ATTIVITÀ DI SVILUPPO**

### **FASE 0: Setup i18n Infrastructure** ✅ COMPLETATA

#### **0.1 Struttura File i18n** ✅
- [x] **Creare cartella root**: `/i18n/`
- [x] **Creare file JSON**:
  - `/i18n/it.json` (italiano - lingua di default)
  - `/i18n/en.json` (inglese)
- [x] **Popolare i18n/it.json** con tutte le chiavi identificate nella sezione B (testi estratti dal codice attuale)
- [x] **Tradurre i18n/en.json** con traduzioni inglesi di tutte le chiavi

#### **0.2 Setup i18n in Frontend-User** ✅
- [x] **Installare dipendenze**: react-i18next, i18next, i18next-http-backend (aggiunte in package.json)
- [x] **Creare `frontend-user/src/i18n.js`** con configurazione completa
- [x] **Inizializzare in `frontend-user/src/main.jsx`**: import './i18n' aggiunto
- [x] **Configurare Nginx** per servire `/i18n/*.json` statici

#### **0.3 Setup i18n in Frontend-Admin** ✅
- [x] **Installare dipendenze**: react-i18next, i18next, i18next-http-backend (aggiunte in package.json)
- [x] **Creare `frontend-admin/src/i18n.js`** con configurazione completa
- [x] **Inizializzare in `frontend-admin/src/main.jsx`**: import './i18n' aggiunto
- [x] **Configurare Nginx** per servire `/i18n/*.json` statici (configurazione condivisa con frontend-user)

#### **0.4 Language Switcher Component (Shared)** ✅
- [x] **Creare componente `LanguageSwitcher.jsx`** in frontend-user con dropdown IT/EN, localStorage, i18n.changeLanguage
- [x] **Creare componente `LanguageSwitcher.jsx`** in frontend-admin con dropdown IT/EN, localStorage, i18n.changeLanguage
- [x] **Nginx Dockerfile aggiornato** per copiare file i18n nella directory servita staticamente
- [x] **Integrazione in layout**: componenti pronti per essere integrati nei layout (task di FASE 3 e 4)

---

### **FASE 1: Backend - Dynamic Text Management** ✅ COMPLETATA

#### **1.1 Database Model** ✅
- [x] **Leggere file attuale**: `backend/core/models.py`
- [x] **Aggiungere modello `ConfigurableText`**:
  ```python
  class ConfigurableText(models.Model):
      key = models.CharField(max_length=255, unique=True, db_index=True)
      # Esempi chiavi: "envelope.front.content", "card.alloggio.content_offered"
      
      content = models.TextField()  # HTML con inline styles
      # Esempio: '<span style="font-family: serif; font-size: 2rem; color: #333;">Domenico & Loredana</span>'
      
      # Metadata per editor (optional, per future features)
      metadata = models.JSONField(default=dict, blank=True)
      # Esempio: {"sections": [{"text": "Domenico & Loredana", "font": "serif", "size": "h1", "color": "#333"}]}
      
      created_at = models.DateTimeField(auto_now_add=True)
      updated_at = models.DateTimeField(auto_now=True)
      
      class Meta:
          ordering = ['key']
          verbose_name = 'Testo Configurabile'
          verbose_name_plural = 'Testi Configurabili'
      
      def __str__(self):
          return self.key
  ```
- [x] **Creare migration**: Ready to execute in FASE 5

#### **1.2 Serializer & ViewSet** ✅
- [x] **Leggere file attuale**: `backend/core/serializers.py`
- [x] **Aggiungere serializer**: ConfigurableTextSerializer
- [x] **Leggere file attuale**: `backend/core/views.py`
- [x] **Aggiungere ViewSet**: ConfigurableTextViewSet con search e lookup by key
- [x] **Leggere file attuale**: `backend/wedding/urls.py`
- [x] **Aggiungere route**: admin_router.register('texts', ConfigurableTextViewSet)

#### **1.3 Public Endpoint per Frontend-User** ✅
- [x] **Aggiungere view pubblica in `backend/core/views.py`**: PublicConfigurableTextView
- [x] **Aggiungere route in `backend/wedding/urls.py`**: /api/public/texts/

#### **1.4 Django Admin Registration** ✅
- [x] **Creare `backend/core/admin.py`**: registrazione completa di tutti i modelli core
- [x] **ConfigurableTextAdmin**: con preview, search e filtri

#### **1.5 Unit Testing** ✅
- [x] **Creare test file**: `backend/core/tests/test_configurable_text.py`
- [x] **Test modello**: creazione, uniqueness, update
- [x] **Test API pubblica**: read-only, no auth
- [x] **Test API admin**: full CRUD, search
- [x] **BugFix**: Risolto `NoReverseMatch` per chiavi con punti in URL (`lookup_value_regex = '[^/]+'`)

---

### **FASE 2: Frontend-Admin - Text Configuration Widget**

#### **2.1 Nuovo Componente Widget**
- [ ] **Creare cartella**: `frontend-admin/src/components/config/`
- [ ] **Creare `TextConfigWidget.jsx`**
- [ ] **Installare dipendenze**: `npm install emoji-picker-react --prefix frontend-admin`
- [ ] **Creare test**: `frontend-admin/src/components/config/__tests__/TextConfigWidget.test.jsx`

#### **2.2 Integrazione in Configuration.jsx**
- [ ] **Leggere file attuale**: `frontend-admin/src/pages/Configuration.jsx`
- [ ] **Aggiungere import e state**
- [ ] **Fetch texts in `useEffect`**
- [ ] **Aggiungere nuova sezione UI**
- [ ] **Implementare `handleSaveText`**

#### **2.3 API Service Update**
- [ ] **Leggere file attuale**: `frontend-admin/src/services/api.js`
- [ ] **Aggiungere metodi API**

---

### **FASE 3: Frontend-User - Dynamic Text Rendering**

#### **3.1 Service per Fetch Texts**
- [ ] **Creare file**: `frontend-user/src/services/textConfig.js`

#### **3.2 Context per Texts**
- [ ] **Creare `frontend-user/src/contexts/TextContext.jsx`**
- [ ] **Wrappare App in `frontend-user/src/main.jsx`**

#### **3.3 Refactoring LetterContent.jsx**
- [ ] **Leggere file attuale**: `frontend-user/src/components/invitation/LetterContent.jsx`
- [ ] **Aggiungere imports i18n e useConfigurableText**
- [ ] **Sostituire Front Face con contenuto dinamico**
- [ ] **Sostituire Card Titles con traduzioni i18n**
- [ ] **Sostituire Card Content con contenuto dinamico**
- [ ] **Sostituire RSVP UI texts con traduzioni i18n**
- [ ] **Sostituire validation messages con traduzioni i18n**
- [ ] **Sostituire WhatsApp messages con traduzioni i18n**

#### **3.4 Refactoring Altri Componenti**
- [ ] **EnvelopeAnimation.jsx**: sostituire eventuali testi hardcoded
- [ ] **InvitationPage.jsx**: sostituire messaggi errore/accesso
- [ ] **Fab.jsx, PaperModal.jsx**: verificare e sostituire testi

---

### **FASE 4: Frontend-Admin - i18n Integration**

#### **4.1 Refactoring Configuration.jsx**
- [ ] **Leggere file attuale**: `frontend-admin/src/pages/Configuration.jsx`
- [ ] **Aggiungere import useTranslation**
- [ ] **Sostituire tutti i testi UI con traduzioni i18n**

#### **4.2 Refactoring Dashboard, InvitationList, ecc.**
- [ ] **Dashboard.jsx**: sostituire testi
- [ ] **InvitationList.jsx**: sostituire testi
- [ ] **WhatsAppConfig.jsx**: sostituire testi
- [ ] **AccommodationsPage.jsx**: sostituire testi
- [ ] **Componenti comuni** (Layout, Sidebar, ecc.): sostituire testi

---

### **FASE 5: Database Migration (BLOCKING STEP - REQUIRES APPROVAL)**

#### **5.1 Pre-Migration Checklist**
- [ ] **Backup Database**
- [ ] **Review Migration File**
- [ ] **Test su ambiente di sviluppo**

#### **5.2 Migration Execution**
- [ ] **Applicare migration**
- [ ] **Verificare tabella creata**

#### **5.3 Seed Initial Data**
- [ ] **Creare management command**
- [ ] **Eseguire seed**

#### **5.4 Rollback Strategy**
- [ ] **Documentare comando rollback**
- [ ] **Testare rollback**

---

### **FASE 6: Testing**

#### **6.1 Backend Tests**
- [x] **Creare test file**: test_configurable_text.py
- [x] **Eseguire tests**: docker-compose exec backend pytest

#### **6.2 Frontend-Admin Tests**
- [ ] **Creare test TextConfigWidget**
- [ ] **Eseguire tests**

#### **6.3 Frontend-User Tests**
- [ ] **Creare test i18n**
- [ ] **Creare test LetterContent**
- [ ] **Eseguire tests**

#### **6.4 Integration Testing**
- [ ] **Smoke Test completo**
- [ ] **E2E Test manual/Playwright**

#### **6.5 Non-Regression Testing**
- [ ] **Verificare funzionalità esistenti**

---

### **FASE 7: Documentazione**

#### **7.1 Technical Documentation**
- [ ] **Aggiornare docs/02-DATABASE.md**
- [ ] **Aggiornare docs/06-BACKEND-CORE.md**
- [ ] **Aggiornare docs/07-BACKEND-API.md**
- [ ] **Aggiornare docs/08-FRONTEND-USER-COMPONENTS.md**
- [ ] **Aggiornare docs/09-FRONTEND-ADMIN-COMPONENTS.md**

#### **7.2 API Documentation**
- [ ] **Aggiornare docs/API_DOCUMENTATION.md**

#### **7.3 User Guide**
- [ ] **Creare docs/USER_GUIDE_TEXT_CUSTOMIZATION.md**

#### **7.4 i18n Documentation**
- [ ] **Creare docs/I18N_GUIDE.md**

#### **7.5 Update AI_RULES.md**
- [ ] **Aggiungere regole i18n**

#### **7.6 Update README.md**
- [ ] **Aggiungere feature e link docs**

---

### **FASE 8: Pull Request & Merge**

#### **8.1 Pre-Merge Checklist**
- [ ] **Tutti i test passano**
- [ ] **Smoke test superato**
- [ ] **Non-regression test superato**
- [ ] **Documentazione completa**
- [ ] **Code review eseguito**
- [ ] **Nessun warning nel build**

#### **8.2 Pull Request Description**
- [ ] **Titolo e descrizione dettagliata**
- [ ] **Aggiungere label**

#### **8.3 Merge Strategy**
- [ ] **Creare Pull Request**
- [ ] **Attendere approval**
- [ ] **Squash and merge**
- [ ] **Tag release**
- [ ] **Delete branch**

---

## 📊 **STATUS TRACKING**

**Last Updated**: 2026-01-14 10:48 CET  
**Status**: 🟢 FASE 1 Completata - TEST PASSED  
**Current Phase**: FASE 2 - Frontend-Admin Text Configuration Widget  
**Progress FASE 1**: 13/13 tasks completed (100%) ✅  
**Progress Totale**: 29/146 tasks completed (20%)  
**Blockers**: None  
**Next Step**: FASE 2.1 - Creare TextConfigWidget.jsx in frontend-admin  

### **Commit History per Checklist Updates**:
```
2026-01-14 10:48 - docs: update checklist - tests passed for FASE 1
2026-01-14 10:27 - docs: update checklist - completed FASE 1 (backend dynamic text management)
2026-01-14 09:52 - docs: update checklist - completed FASE 0 (i18n infrastructure setup)
2026-01-14 09:35 - docs: add golden rules and update instructions to checklist
2026-01-14 09:33 - docs: add comprehensive checklist for text customization and i18n implementation
```

### **FASE 0 - Commits & Files Created**:
```
Commit: be6c155 - feat(i18n): add Italian and English translation JSON files
Files:
  - /i18n/it.json (100+ translation keys)
  - /i18n/en.json (100+ translation keys)

Commit: 7da82a9 - feat(i18n): setup i18n infrastructure for frontend-user and frontend-admin
Files:
  - frontend-user/package.json (updated with i18n dependencies)
  - frontend-admin/package.json (updated with i18n dependencies)
  - frontend-user/src/i18n.js (NEW)
  - frontend-admin/src/i18n.js (NEW)
  - frontend-user/src/main.jsx (updated with i18n import)
  - frontend-admin/src/main.jsx (updated with i18n import)
  - frontend-user/src/components/LanguageSwitcher.jsx (NEW)
  - frontend-admin/src/components/LanguageSwitcher.jsx (NEW)
  - nginx/conf.d/default.conf (updated with /i18n/ location)

Commit: c7bb6f3 - feat(nginx): add i18n static files to Nginx image
Files:
  - nginx/Dockerfile (updated to copy i18n files)
```

### **FASE 1 - Commits & Files Created**:
```
Commit: d38acc6 - feat(backend): add ConfigurableText model for dynamic text management
Files:
  - backend/core/models.py (evolved: added ConfigurableText model)

Commit: caa3784 - feat(backend): add ConfigurableTextSerializer
Files:
  - backend/core/serializers.py (evolved: added ConfigurableTextSerializer)

Commit: 945bed9 - feat(backend): add ConfigurableTextViewSet and PublicConfigurableTextView
Files:
  - backend/core/views.py (evolved: added ConfigurableTextViewSet, PublicConfigurableTextView)

Commit: 85c8509 - feat(backend): register ConfigurableText endpoints in routing
Files:
  - backend/wedding/urls.py (evolved: registered admin and public endpoints)

Commit: 9e484e5 - feat(backend): register models in Django Admin Panel
Files:
  - backend/core/admin.py (NEW: complete admin registration)

Commit: 090d5a1 - test(backend): add comprehensive tests for ConfigurableText
Files:
  - backend/core/tests/test_configurable_text.py (NEW: 20+ test cases)

Commit: 304e429 - fix(backend): allow dots in ConfigurableText lookup URL
Files:
  - backend/core/views.py (updated ViewSet regex)
```

---

**👉 FASE 1 completata e testata con successo! Procedere con FASE 2: Frontend-Admin - Text Configuration Widget**
