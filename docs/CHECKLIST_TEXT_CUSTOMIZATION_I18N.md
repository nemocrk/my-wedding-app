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

## 🔍 **ANALISI TESTI ESISTENTI**

### **A. Testi da Gestire con Widget Dinamico (Database)**

#### **A.1 Front della Busta** (LetterContent.jsx - Front Face)
**Chiave DB**: `envelope.front.content`

**Testo Attuale (Italiano)**:
```
Domenico & Loredana

Abbiamo deciso di fare il grande passo...
e di farlo a piedi nudi!

Ci sposiamo il 19 Settembre 2026
sulla spiaggia di Golfo Aranci

(Sì! in Sardegna!!)

Preparatevi a scambiare le scarpe strette con la sabbia tra le dita. Vi promettiamo:

Poca formalità • Molto spritz • Un tramonto indimenticabile

Dress Code: Beach Chic
(I tacchi a spillo sono i nemici numero uno della sabbia!)
```

**Stile Attuale**:
- Nomi: Font decorativo, size large
- Corpo: Font sans-serif, size medium
- Highlights: Font bold, emoji inline

#### **A.2 Card Content** (LetterContent.jsx - renderCardContent)

**Card: Alloggio**
- Chiave DB: `card.alloggio.content_offered`
- Testo IT: `"Abbiamo riservato per voi una sistemazione. Maggiori dettagli a breve!"`
- Chiave DB: `card.alloggio.content_not_offered`
- Testo IT: `"Per suggerimenti sugli alloggi nella zona, contattateci!"`

**Card: Viaggio**
- Chiave DB: `card.viaggio.content`
- Testo IT: `"Informazioni sui trasporti e come raggiungere la location."`

**Card: Evento**
- Chiave DB: `card.evento.content`
- Testo IT: (dinamico da `data.letter_content` - già gestito via API Config)

**Card: Dress Code**
- Chiave DB: `card.dresscode.content`
- Testo IT: 
```
Beach Chic

Eleganti ma comodi! Tacchi a spillo vietati sulla sabbia!
```

**Card: Bottino di Nozze**
- Chiave DB: `card.bottino.content`
- Testo IT:
```
La vostra presenza è il regalo più grande!

Dettagli IBAN in arrivo!
```

**Card: Cos'altro**
- Chiave DB: `card.cosaltro.content`
- Testo IT:
```
Hai domande?

Contattaci via WhatsApp:
```

---

### **B. Testi da Gestire con i18n Statico (JSON)**

#### **B.1 Frontend-User - UI Elements**

##### **Card Titles**
```json
{
  "cards": {
    "alloggio": {
      "title": "Alloggio",
      "title_en": "Accommodation"
    },
    "viaggio": {
      "title": "Viaggio",
      "title_en": "Travel"
    },
    "evento": {
      "title": "L'Evento",
      "title_en": "The Event"
    },
    "dresscode": {
      "title": "Dress Code",
      "title_en": "Dress Code"
    },
    "bottino": {
      "title": "Bottino di nozze",
      "title_en": "Wedding Gift Registry"
    },
    "cosaltro": {
      "title": "Cos'altro?",
      "title_en": "What else?"
    }
  }
}
```

##### **RSVP Wizard - Step Titles**
```json
{
  "rsvp": {
    "steps": {
      "summary": {
        "title": "Il tuo RSVP",
        "title_en": "Your RSVP"
      },
      "guests": {
        "title": "Conferma Ospiti",
        "title_en": "Confirm Guests"
      },
      "contact": {
        "title": "Numero di Contatto",
        "title_en": "Contact Number"
      },
      "travel": {
        "title": "Come Viaggerai?",
        "title_en": "How Will You Travel?"
      },
      "accommodation": {
        "title": "Alloggio",
        "title_en": "Accommodation"
      },
      "final": {
        "title": "Conferma Finale",
        "title_en": "Final Confirmation"
      }
    }
  }
}
```

##### **RSVP Status Messages**
```json
{
  "rsvp": {
    "status": {
      "pending": {
        "emoji": "⏳",
        "text": "Cosa aspetti? Conferma subito!",
        "text_en": "What are you waiting for? Confirm now!"
      },
      "confirmed": {
        "emoji": "🎉",
        "text": "Magnifico! Ti aspettiamo!!!",
        "text_en": "Wonderful! We're waiting for you!!!"
      },
      "declined": {
        "emoji": "😢",
        "text": "Faremo un brindisi per te!",
        "text_en": "We'll toast to you!"
      }
    }
  }
}
```

##### **RSVP Labels & Buttons**
```json
{
  "rsvp": {
    "labels": {
      "invited_guests": "Ospiti invitati:",
      "invited_guests_en": "Invited guests:",
      "contact_number": "Numero di contatto:",
      "contact_number_en": "Contact number:",
      "transport_type": "Tipo di trasporto:",
      "transport_type_en": "Transport type:",
      "schedule": "Orari:",
      "schedule_en": "Schedule:",
      "car": "Auto:",
      "car_en": "Car:",
      "summary": "Riepilogo:",
      "summary_en": "Summary:",
      "guests": "Ospiti:",
      "guests_en": "Guests:",
      "phone": "Telefono:",
      "phone_en": "Phone:",
      "transport": "Trasporto:",
      "transport_en": "Transport:",
      "accommodation": "Alloggio:",
      "accommodation_en": "Accommodation:"
    },
    "buttons": {
      "next": "Avanti →",
      "next_en": "Next →",
      "back": "← Indietro",
      "back_en": "← Back",
      "confirm_presence": "✔️ Conferma Presenza",
      "confirm_presence_en": "✔️ Confirm Attendance",
      "decline": "❌ Declina",
      "decline_en": "❌ Decline",
      "save_changes": "💾 Salva Modifiche",
      "save_changes_en": "💾 Save Changes",
      "modify_answer": "Modifica Risposta",
      "modify_answer_en": "Modify Answer"
    },
    "options": {
      "ferry": "Traghetto",
      "ferry_en": "Ferry",
      "plane": "Aereo",
      "plane_en": "Plane",
      "car_with": "Auto al seguito",
      "car_with_en": "Car on board",
      "car_rental": "Noleggerò un'auto",
      "car_rental_en": "I'll rent a car",
      "carpool_interest": "Sarebbe carino organizzarmi con qualcun altro",
      "carpool_interest_en": "It would be nice to coordinate with someone else",
      "accommodation_question": "Vuoi richiedere l'alloggio per la notte tra il 19 e il 20 settembre?",
      "accommodation_question_en": "Do you want to request accommodation for the night between September 19 and 20?",
      "accommodation_yes": "Sì, richiedo l'alloggio",
      "accommodation_yes_en": "Yes, I request accommodation",
      "yes": "Sì",
      "yes_en": "Yes",
      "no": "No",
      "no_en": "No"
    }
  }
}
```

##### **Validation Messages**
```json
{
  "rsvp": {
    "validation": {
      "no_guests": "Devi confermare almeno un ospite!",
      "no_guests_en": "You must confirm at least one guest!",
      "phone_required": "Il numero di telefono è obbligatorio",
      "phone_required_en": "Phone number is required",
      "phone_invalid": "Formato non valido (es: +39 333 1234567)",
      "phone_invalid_en": "Invalid format (e.g., +39 333 1234567)",
      "travel_incomplete": "Compila tutti i campi del viaggio!",
      "travel_incomplete_en": "Fill in all travel fields!",
      "phone_empty": "Il numero di telefono è obbligatorio",
      "phone_empty_en": "Phone number is required"
    },
    "messages": {
      "already_confirmed": "Hai già confermato la tua presenza!",
      "already_confirmed_en": "You have already confirmed your attendance!",
      "declined": "Hai declinato l'invito.",
      "declined_en": "You have declined the invitation.",
      "submitting": "Invio...",
      "submitting_en": "Submitting...",
      "not_specified": "Non specificato",
      "not_specified_en": "Not specified"
    }
  }
}
```

##### **WhatsApp Messages**
```json
{
  "whatsapp": {
    "default_message": "Ciao, sono {guest_name}, avrei una domanda!",
    "default_message_en": "Hi, I'm {guest_name}, I have a question!",
    "alert_modify_confirmed": "⚠️ Hai già confermato! Per modificare contatta gli sposi:",
    "alert_modify_confirmed_en": "⚠️ You have already confirmed! To modify, contact the couple:",
    "alert_confirm_after_decline": "⚠️ Se vuoi confermare dopo aver declinato, contatta gli sposi:",
    "alert_confirm_after_decline_en": "⚠️ If you want to confirm after declining, contact the couple:",
    "alert_accommodation_change": "⚠️ Avevi già accettato! Contatta gli sposi:",
    "alert_accommodation_change_en": "⚠️ You had already accepted! Contact the couple:"
  }
}
```

##### **Badge Labels**
```json
{
  "badges": {
    "child": "Bambino",
    "child_en": "Child"
  }
}
```

#### **B.2 Frontend-Admin - UI Elements**

##### **Configuration Page**
```json
{
  "admin": {
    "config": {
      "page_title": "Configurazione",
      "page_title_en": "Configuration",
      "page_subtitle": "Gestisci prezzi, testi e sicurezza dell'applicazione",
      "page_subtitle_en": "Manage prices, texts and application security",
      "loading": "Caricamento configurazione...",
      "loading_en": "Loading configuration...",
      "save_button": "Salva Modifiche",
      "save_button_en": "Save Changes",
      "saving": "Salvataggio...",
      "saving_en": "Saving...",
      "success_message": "Configurazione salvata con successo!",
      "success_message_en": "Configuration saved successfully!",
      "error_message": "Errore durante il salvataggio.",
      "error_message_en": "Error during save.",
      "error_load": "Errore caricamento configurazione.",
      "error_load_en": "Error loading configuration."
    },
    "sections": {
      "prices": {
        "title": "Gestione Costi Unitari",
        "title_en": "Unit Cost Management",
        "adult_meal": "Pranzo Adulti (€)",
        "adult_meal_en": "Adult Meal (€)",
        "child_meal": "Pranzo Bambini (€)",
        "child_meal_en": "Child Meal (€)",
        "accommodation_adult": "Alloggio Adulti (€)",
        "accommodation_adult_en": "Adult Accommodation (€)",
        "accommodation_child": "Alloggio Bambini (€)",
        "accommodation_child_en": "Child Accommodation (€)",
        "transfer": "Transfer per persona (€)",
        "transfer_en": "Transfer per person (€)"
      },
      "texts": {
        "title": "Testi e Comunicazioni",
        "title_en": "Texts and Communications",
        "letter_template": "Template Lettera di Benvenuto",
        "letter_template_en": "Welcome Letter Template",
        "available_vars": "Disponibili: {guest_names}, {family_name}, {code}",
        "available_vars_en": "Available: {guest_names}, {family_name}, {code}",
        "placeholder": "Inserisci qui il testo...",
        "placeholder_en": "Enter text here..."
      },
      "security": {
        "title": "Sicurezza Link Pubblici",
        "title_en": "Public Link Security",
        "secret_key": "Chiave Segreta per Link",
        "secret_key_en": "Secret Key for Links",
        "secret_warning": "(ATTENZIONE: Modificando questo valore, tutti i link inviati precedentemente smetteranno di funzionare)",
        "secret_warning_en": "(WARNING: Changing this value will make all previously sent links stop working)",
        "unauthorized_message": "Messaggio di Errore (Link Scaduto/Invalido)",
        "unauthorized_message_en": "Error Message (Expired/Invalid Link)"
      },
      "whatsapp": {
        "title": "Configurazione WhatsApp",
        "title_en": "WhatsApp Configuration",
        "rate_limit": "Rate Limit (messaggi/ora)",
        "rate_limit_en": "Rate Limit (messages/hour)",
        "rate_limit_hint": "Limite di sicurezza per sessione (Anti-Ban)",
        "rate_limit_hint_en": "Safety limit per session (Anti-Ban)",
        "rate_limit_note": "Valore consigliato: 10 msg/ora. Non superare 20 per evitare ban da WhatsApp.",
        "rate_limit_note_en": "Recommended value: 10 msg/hour. Do not exceed 20 to avoid WhatsApp ban.",
        "placeholder_rate": "10",
        "placeholder_rate_en": "10"
      },
      "text_customization": {
        "title": "Personalizzazione Testi",
        "title_en": "Text Customization",
        "subtitle": "Configura i contenuti lunghi della lettera di invito",
        "subtitle_en": "Configure long contents of the invitation letter",
        "envelope_front": "Front della Busta",
        "envelope_front_en": "Envelope Front",
        "card_contents": "Contenuti delle Card",
        "card_contents_en": "Card Contents",
        "preview": "Anteprima",
        "preview_en": "Preview",
        "edit": "Modifica",
        "edit_en": "Edit",
        "font": "Font",
        "font_en": "Font",
        "size": "Dimensione",
        "size_en": "Size",
        "color": "Colore",
        "color_en": "Color",
        "emoji": "Emoji",
        "emoji_en": "Emoji",
        "add_emoji": "Aggiungi Emoji",
        "add_emoji_en": "Add Emoji"
      }
    }
  }
}
```

##### **Dashboard, InvitationList, WhatsAppConfig, ecc.**
(Estensione da mappare analizzando ogni pagina - da completare in fase di implementazione)

---

## 📦 **ATTIVITÀ DI SVILUPPO**

### **FASE 0: Setup i18n Infrastructure**

#### **0.1 Struttura File i18n**
- [ ] **Creare cartella root**: `/i18n/`
- [ ] **Creare file JSON**:
  - `/i18n/it.json` (italiano - lingua di default)
  - `/i18n/en.json` (inglese)
- [ ] **Popolare i18n/it.json** con tutte le chiavi identificate nella sezione B (testi estratti dal codice attuale)
- [ ] **Tradurre i18n/en.json** con traduzioni inglesi di tutte le chiavi

#### **0.2 Setup i18n in Frontend-User**
- [ ] **Installare dipendenze**: `npm install react-i18next i18next i18next-http-backend --prefix frontend-user`
- [ ] **Creare `frontend-user/src/i18n.js`**:
  ```javascript
  import i18n from 'i18next';
  import { initReactI18next } from 'react-i18next';
  import HttpBackend from 'i18next-http-backend';
  
  i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
      fallbackLng: 'it',
      lng: localStorage.getItem('language') || 'it',
      backend: {
        loadPath: '/i18n/{{lng}}.json',
      },
      interpolation: { escapeValue: false }
    });
  
  export default i18n;
  ```
- [ ] **Inizializzare in `frontend-user/src/main.jsx`**: `import './i18n';`
- [ ] **Configurare Nginx** per servire `/i18n/*.json` statici

#### **0.3 Setup i18n in Frontend-Admin**
- [ ] **Installare dipendenze**: `npm install react-i18next i18next i18next-http-backend --prefix frontend-admin`
- [ ] **Creare `frontend-admin/src/i18n.js`** (stesso contenuto di frontend-user)
- [ ] **Inizializzare in `frontend-admin/src/main.jsx`**: `import './i18n';`
- [ ] **Configurare Nginx** per servire `/i18n/*.json` statici

#### **0.4 Language Switcher Component (Shared)**
- [ ] **Creare componente `LanguageSwitcher.jsx`** (da duplicare in entrambi i frontend):
  - Dropdown con flag IT/EN
  - Salva preferenza in `localStorage.setItem('language', lang)`
  - Ricarica i18n con `i18n.changeLanguage(lang)`
- [ ] **Integrare in layout** di frontend-user (header/footer)
- [ ] **Integrare in layout** di frontend-admin (top bar)

---

### **FASE 1: Backend - Dynamic Text Management**

#### **1.1 Database Model**
- [ ] **Leggere file attuale**: `backend/core/models.py`
- [ ] **Aggiungere modello `ConfigurableText`**:
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
          verbose_name = 'Configurable Text'
          verbose_name_plural = 'Configurable Texts'
      
      def __str__(self):
          return self.key
  ```
- [ ] **Creare migration**: `docker-compose exec backend python manage.py makemigrations`
- [ ] **NON APPLICARE ANCORA** (attendere FASE 5 - Database Governance)

#### **1.2 Serializer & ViewSet**
- [ ] **Leggere file attuale**: `backend/core/serializers.py`
- [ ] **Aggiungere serializer**:
  ```python
  class ConfigurableTextSerializer(serializers.ModelSerializer):
      class Meta:
          model = ConfigurableText
          fields = ['key', 'content', 'metadata', 'updated_at']
          read_only_fields = ['updated_at']
  ```
- [ ] **Leggere file attuale**: `backend/core/views.py`
- [ ] **Aggiungere ViewSet**:
  ```python
  from rest_framework import viewsets
  from rest_framework.permissions import IsAuthenticated
  from .models import ConfigurableText
  from .serializers import ConfigurableTextSerializer
  
  class ConfigurableTextViewSet(viewsets.ModelViewSet):
      queryset = ConfigurableText.objects.all()
      serializer_class = ConfigurableTextSerializer
      permission_classes = [IsAuthenticated]  # Admin only per CRUD
      lookup_field = 'key'
  ```
- [ ] **Leggere file attuale**: `backend/core/urls.py`
- [ ] **Aggiungere route**:
  ```python
  from rest_framework.routers import DefaultRouter
  from .views import ConfigurableTextViewSet
  
  router = DefaultRouter()
  router.register(r'admin/texts', ConfigurableTextViewSet, basename='configurable-text')
  urlpatterns += router.urls
  ```

#### **1.3 Public Endpoint per Frontend-User**
- [ ] **Aggiungere view pubblica in `backend/core/views.py`**:
  ```python
  from rest_framework.decorators import api_view, permission_classes
  from rest_framework.permissions import AllowAny
  from rest_framework.response import Response
  
  @api_view(['GET'])
  @permission_classes([AllowAny])
  def get_configurable_texts(request):
      texts = ConfigurableText.objects.all()
      data = {text.key: text.content for text in texts}
      return Response(data)
  ```
- [ ] **Aggiungere route in `backend/core/urls.py`**:
  ```python
  path('public/texts/', views.get_configurable_texts, name='public-texts'),
  ```

---

### **FASE 2: Frontend-Admin - Text Configuration Widget**

#### **2.1 Nuovo Componente Widget**
- [ ] **Creare cartella**: `frontend-admin/src/components/config/`
- [ ] **Creare `TextConfigWidget.jsx`**:
  - Props: `textKey`, `initialContent`, `onSave(content)`
  - State: `content` (HTML string), `selectedRange` (text selection)
  - **Toolbar**:
    - Font selector (dropdown: serif, sans-serif, monospace, cursive, fantasy)
    - Size selector (dropdown: h1, h2, h3, h4, p, small)
    - Color picker (input type="color")
    - Emoji picker button (libreria `emoji-picker-react`)
  - **Editor**: `contentEditable` div o libreria come `react-quill` (lightweight)
  - **Preview**: Render HTML in real-time
  - **Actions**: Applica stile a selezione, inserisci emoji, salva
- [ ] **Installare dipendenze**: `npm install emoji-picker-react --prefix frontend-admin`
- [ ] **Creare test**: `frontend-admin/src/components/config/__tests__/TextConfigWidget.test.jsx`

#### **2.2 Integrazione in Configuration.jsx**
- [ ] **Leggere file attuale**: `frontend-admin/src/pages/Configuration.jsx`
- [ ] **Aggiungere import**: `import { Type } from 'lucide-react';`
- [ ] **Aggiungere state**:
  ```javascript
  const [configurableTexts, setConfigurableTexts] = useState({});
  ```
- [ ] **Fetch texts in `useEffect`**:
  ```javascript
  const fetchTexts = async () => {
    const data = await api.getConfigurableTexts();
    setConfigurableTexts(data);
  };
  ```
- [ ] **Aggiungere nuova sezione UI** dopo "SECTION 4: WHATSAPP":
  ```jsx
  {/* SECTION 5: TEXT CUSTOMIZATION */}
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <div className="flex items-center mb-4 pb-2 border-b border-gray-100">
      <Type className="text-pink-600 mr-2" size={20}/>
      <h2 className="text-lg font-semibold text-gray-800">{t('admin.sections.text_customization.title')}</h2>
    </div>
    
    <div className="space-y-6">
      {/* Front della Busta */}
      <div>
        <h3 className="font-medium mb-2">{t('admin.sections.text_customization.envelope_front')}</h3>
        <TextConfigWidget 
          textKey="envelope.front.content"
          initialContent={configurableTexts['envelope.front.content']}
          onSave={(content) => handleSaveText('envelope.front.content', content)}
        />
      </div>
      
      {/* Card Contents */}
      <div>
        <h3 className="font-medium mb-2">{t('admin.sections.text_customization.card_contents')}</h3>
        {['alloggio', 'viaggio', 'dresscode', 'bottino', 'cosaltro'].map(cardKey => (
          <div key={cardKey} className="mb-4">
            <h4 className="text-sm font-medium text-gray-600 mb-1">{t(`cards.${cardKey}.title`)}</h4>
            <TextConfigWidget 
              textKey={`card.${cardKey}.content`}
              initialContent={configurableTexts[`card.${cardKey}.content`]}
              onSave={(content) => handleSaveText(`card.${cardKey}.content`, content)}
            />
          </div>
        ))}
      </div>
    </div>
  </div>
  ```
- [ ] **Implementare `handleSaveText`**:
  ```javascript
  const handleSaveText = async (key, content) => {
    try {
      await api.updateConfigurableText(key, { content });
      setMessage({ type: 'success', text: t('admin.config.success_message') });
    } catch (error) {
      setMessage({ type: 'error', text: t('admin.config.error_message') });
    }
  };
  ```

#### **2.3 API Service Update**
- [ ] **Leggere file attuale**: `frontend-admin/src/services/api.js`
- [ ] **Aggiungere metodi**:
  ```javascript
  export const api = {
    // ... existing methods ...
    
    getConfigurableTexts: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/texts/`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!response.ok) throw new Error('Failed to fetch texts');
      return response.json();
    },
    
    updateConfigurableText: async (key, data) => {
      const response = await fetch(`${API_BASE_URL}/admin/texts/${key}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update text');
      return response.json();
    }
  };
  ```

---

### **FASE 3: Frontend-User - Dynamic Text Rendering**

#### **3.1 Service per Fetch Texts**
- [ ] **Creare file**: `frontend-user/src/services/textConfig.js`
  ```javascript
  const API_BASE_URL = import.meta.env.VITE_API_URL;
  
  export const fetchConfigurableTexts = async () => {
    const response = await fetch(`${API_BASE_URL}/public/texts/`);
    if (!response.ok) throw new Error('Failed to fetch texts');
    return response.json();
  };
  ```

#### **3.2 Context per Texts (Optional ma Recommended)**
- [ ] **Creare `frontend-user/src/contexts/TextContext.jsx`**:
  ```javascript
  import React, { createContext, useContext, useState, useEffect } from 'react';
  import { fetchConfigurableTexts } from '../services/textConfig';
  
  const TextContext = createContext();
  
  export const TextProvider = ({ children }) => {
    const [texts, setTexts] = useState({});
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      const loadTexts = async () => {
        try {
          const data = await fetchConfigurableTexts();
          setTexts(data);
        } catch (error) {
          console.error('Error loading texts:', error);
        } finally {
          setLoading(false);
        }
      };
      loadTexts();
    }, []);
    
    return (
      <TextContext.Provider value={{ texts, loading }}>
        {children}
      </TextContext.Provider>
    );
  };
  
  export const useConfigurableText = (key) => {
    const { texts, loading } = useContext(TextContext);
    return { text: texts[key] || '', loading };
  };
  ```
- [ ] **Wrappare App in `frontend-user/src/main.jsx`**:
  ```javascript
  import { TextProvider } from './contexts/TextContext';
  
  <TextProvider>
    <App />
  </TextProvider>
  ```

#### **3.3 Refactoring LetterContent.jsx**
- [ ] **Leggere file attuale**: `frontend-user/src/components/invitation/LetterContent.jsx`
- [ ] **Aggiungere imports**:
  ```javascript
  import { useTranslation } from 'react-i18next';
  import { useConfigurableText } from '../../contexts/TextContext';
  ```
- [ ] **Sostituire Front Face**:
  ```javascript
  const { t } = useTranslation();
  const { text: frontContent, loading: frontLoading } = useConfigurableText('envelope.front.content');
  
  // Nella JSX:
  <div className="front-content">
    <div className="spacer-top"></div>
    {frontLoading ? (
      <p>Loading...</p>
    ) : (
      <div dangerouslySetInnerHTML={{ __html: frontContent }} />
    )}
  </div>
  ```
- [ ] **Sostituire Card Titles**:
  ```javascript
  const cards = {
    'alloggio': { title: t('cards.alloggio.title'), icon: homeIcon },
    'viaggio': { title: t('cards.viaggio.title'), icon: vanIcon },
    'evento': { title: t('cards.evento.title'), icon: archIcon },
    'dresscode': { title: t('cards.dresscode.title'), icon: dressIcon },
    'bottino': { title: t('cards.bottino.title'), icon: chestIcon },
    'cosaltro': { title: t('cards.cosaltro.title'), icon: questionsIcon },
  };
  ```
- [ ] **Sostituire Card Content in `renderCardContent`**:
  ```javascript
  const renderCardContent = (cardId) => {
    const { text: cardContent } = useConfigurableText(`card.${cardId}.content`);
    
    switch (cardId) {
      case 'alloggio':
        return (
          <div className="expanded-content">
            <h2>{t('cards.alloggio.title')}</h2>
            <div dangerouslySetInnerHTML={{ __html: cardContent }} />
          </div>
        );
      // ... repeat for other cards
    }
  };
  ```
- [ ] **Sostituire RSVP UI texts** con `t('rsvp.steps.guests.title')`, ecc.
- [ ] **Sostituire validation messages** con `t('rsvp.validation.no_guests')`, ecc.
- [ ] **Sostituire WhatsApp messages** con `t('whatsapp.default_message', { guest_name: data.name })`

#### **3.4 Refactoring Altri Componenti**
- [ ] **EnvelopeAnimation.jsx**: sostituire eventuali testi hardcoded
- [ ] **InvitationPage.jsx**: sostituire messaggi errore/accesso
- [ ] **Fab.jsx, PaperModal.jsx**: verificare e sostituire testi

---

### **FASE 4: Frontend-Admin - i18n Integration**

#### **4.1 Refactoring Configuration.jsx**
- [ ] **Leggere file attuale**: `frontend-admin/src/pages/Configuration.jsx`
- [ ] **Aggiungere import**: `import { useTranslation } from 'react-i18next';`
- [ ] **Aggiungere hook**: `const { t } = useTranslation();`
- [ ] **Sostituire tutti i testi UI**:
  - Esempio: `"Configurazione"` → `{t('admin.config.page_title')}`
  - Esempio: `"Gestione Costi Unitari"` → `{t('admin.sections.prices.title')}`
  - Esempio: `"Pranzo Adulti (€)"` → `{t('admin.sections.prices.adult_meal')}`
  - ecc. (seguire mappatura in sezione B.2)

#### **4.2 Refactoring Dashboard, InvitationList, ecc.**
- [ ] **Dashboard.jsx**: sostituire testi con `t('admin.dashboard.*')`
- [ ] **InvitationList.jsx**: sostituire testi con `t('admin.invitations.*')`
- [ ] **WhatsAppConfig.jsx**: sostituire testi con `t('admin.whatsapp.*')`
- [ ] **AccommodationsPage.jsx**: sostituire testi con `t('admin.accommodations.*')`
- [ ] **Componenti comuni** (Layout, Sidebar, ecc.): sostituire testi

---

### **FASE 5: Database Migration (BLOCKING STEP - REQUIRES APPROVAL)**

#### **5.1 Pre-Migration Checklist**
- [ ] **Backup Database**: `docker-compose exec db pg_dump -U wedding_user wedding_db > backup_pre_text_customization.sql`
- [ ] **Review Migration File**: controllare `backend/core/migrations/000X_configurable_text.py`
- [ ] **Test su ambiente di sviluppo**: applicare migration e verificare nessun breaking change

#### **5.2 Migration Execution**
- [ ] **Applicare migration**: `docker-compose exec backend python manage.py migrate`
- [ ] **Verificare tabella creata**: `docker-compose exec db psql -U wedding_user -d wedding_db -c "\d core_configurabletext"`

#### **5.3 Seed Initial Data**
- [ ] **Creare management command**: `backend/core/management/commands/seed_configurable_texts.py`
  ```python
  from django.core.management.base import BaseCommand
  from core.models import ConfigurableText
  
  class Command(BaseCommand):
      help = 'Seed initial configurable texts'
      
      def handle(self, *args, **kwargs):
          texts = [
              {
                  'key': 'envelope.front.content',
                  'content': '<div style="text-align: center;">...HTML from current LetterContent...</div>'
              },
              # ... add all card contents
          ]
          
          for text_data in texts:
              ConfigurableText.objects.update_or_create(
                  key=text_data['key'],
                  defaults={'content': text_data['content']}
              )
          
          self.stdout.write(self.style.SUCCESS(f'Seeded {len(texts)} texts'))
  ```
- [ ] **Eseguire seed**: `docker-compose exec backend python manage.py seed_configurable_texts`

#### **5.4 Rollback Strategy**
- [ ] **Documentare comando rollback**: `python manage.py migrate core <previous_migration_number>`
- [ ] **Testare rollback** su ambiente di sviluppo

---

### **FASE 6: Testing**

#### **6.1 Backend Tests**
- [ ] **Creare test file**: `backend/core/tests/test_configurable_text.py`
  - Test CRUD operations su `ConfigurableText` model
  - Test API endpoints (GET /admin/texts/, PATCH /admin/texts/{key}/)
  - Test public endpoint (GET /public/texts/)
- [ ] **Eseguire tests**: `docker-compose exec backend pytest backend/core/tests/test_configurable_text.py`

#### **6.2 Frontend-Admin Tests**
- [ ] **Creare test**: `frontend-admin/src/components/config/__tests__/TextConfigWidget.test.jsx`
  - Test rendering widget
  - Test toolbar interactions (font, size, color, emoji)
  - Test save functionality
- [ ] **Eseguire tests**: `npm test --prefix frontend-admin`

#### **6.3 Frontend-User Tests**
- [ ] **Creare test**: `frontend-user/src/__tests__/i18n.test.js`
  - Test language switching
  - Test translation rendering
- [ ] **Creare test**: `frontend-user/src/__tests__/LetterContent.test.jsx`
  - Test dynamic text loading
  - Test fallback quando API fallisce
- [ ] **Eseguire tests**: `npm test --prefix frontend-user`

#### **6.4 Integration Testing**
- [ ] **Smoke Test**:
  - Build containers: `docker-compose build`
  - Start stack: `docker-compose up -d`
  - Verify backend API: `curl http://localhost:8000/api/public/texts/`
  - Access frontend-user: verificare testi caricati correttamente
  - Access frontend-admin: configurare un testo e salvare
  - Reload frontend-user: verificare aggiornamento testo
- [ ] **E2E Test** (manual o Playwright):
  - Cambio lingua in frontend-user
  - Configurazione testo in frontend-admin
  - RSVP flow completo con nuovi testi

#### **6.5 Non-Regression Testing**
- [ ] **Verificare funzionalità esistenti**:
  - Animazione apertura busta (EnvelopeAnimation)
  - RSVP wizard completo (tutti gli step)
  - Heatmap analytics (frontend-admin)
  - WhatsApp link generation
  - Filtri e ricerca in InvitationList

---

### **FASE 7: Documentazione**

#### **7.1 Technical Documentation**
- [ ] **Leggere e aggiornare**: `docs/02-DATABASE.md`
  - Aggiungere sezione `ConfigurableText` model
- [ ] **Leggere e aggiornare**: `docs/06-BACKEND-CORE.md`
  - Documentare nuovo modello e ViewSet
- [ ] **Leggere e aggiornare**: `docs/07-BACKEND-API.md`
  - Documentare nuovi endpoints `/admin/texts/` e `/public/texts/`
- [ ] **Leggere e aggiornare**: `docs/08-FRONTEND-USER-COMPONENTS.md`
  - Documentare integrazione i18n
  - Documentare `TextContext` e `useConfigurableText` hook
- [ ] **Leggere e aggiornare**: `docs/09-FRONTEND-ADMIN-COMPONENTS.md`
  - Documentare `TextConfigWidget`
  - Aggiornare sezione `Configuration.jsx`

#### **7.2 API Documentation**
- [ ] **Leggere e aggiornare**: `docs/API_DOCUMENTATION.md`
  - Aggiungere sezione **Configurable Texts**:
    - `GET /api/admin/texts/` - List all configurable texts (Admin)
    - `GET /api/admin/texts/{key}/` - Get single text (Admin)
    - `PATCH /api/admin/texts/{key}/` - Update text (Admin)
    - `GET /api/public/texts/` - Get all texts as key-value pairs (Public)

#### **7.3 User Guide**
- [ ] **Creare nuovo file**: `docs/USER_GUIDE_TEXT_CUSTOMIZATION.md`
  - Introduzione alla feature
  - Come accedere alla sezione "Personalizzazione Testi"
  - Come modificare il front della busta:
    - Selezionare testo
    - Applicare stile (font, size, color)
    - Inserire emoji
    - Salvare modifiche
  - Come modificare il contenuto delle card
  - Preview real-time
  - Best practices (dimensioni testo, contrasto colori, emoji con moderazione)
  - Screenshot annotati

#### **7.4 i18n Documentation**
- [ ] **Creare nuovo file**: `docs/I18N_GUIDE.md`
  - Architettura i18n (file JSON condivisi)
  - Struttura chiavi (naming convention)
  - Come aggiungere nuove traduzioni
  - Come cambiare lingua nell'app
  - Fallback strategy (IT come default)
  - Testing traduzioni

#### **7.5 Update AI_RULES.md**
- [ ] **Leggere e aggiornare**: `AI_RULES.md`
  - Aggiungere regola: "Quando si aggiungono nuovi testi UI, SEMPRE aggiornare `/i18n/it.json` e `/i18n/en.json`"
  - Aggiungere regola: "Non hardcodare MAI testi utente-visibili, usare sempre `t('key')` da react-i18next"

#### **7.6 Update README.md**
- [ ] **Leggere e aggiornare**: `README.md` (root del repo)
  - Aggiungere feature "Text Customization & i18n" nella sezione Features
  - Link a `docs/USER_GUIDE_TEXT_CUSTOMIZATION.md` e `docs/I18N_GUIDE.md`

---

### **FASE 8: Pull Request & Merge**

#### **8.1 Pre-Merge Checklist**
- [ ] **Tutti i test passano**: backend, frontend-user, frontend-admin
- [ ] **Smoke test superato**: stack completo funzionante
- [ ] **Non-regression test superato**: funzionalità esistenti non rotte
- [ ] **Documentazione completa**: tutti i file in `/docs` aggiornati
- [ ] **Code review eseguito**: almeno un reviewer ha approvato
- [ ] **Nessun warning nel build**: controllare logs Docker

#### **8.2 Pull Request Description**
- [ ] **Titolo**: `feat: Dynamic Text Customization & Full i18n Support`
- [ ] **Descrizione dettagliata**:
  ```markdown
  ## 🎯 Obiettivo
  Implementazione completa di:
  1. Configurazione dinamica dei contenuti lunghi (Front Busta + Card Content)
  2. Internazionalizzazione (IT/EN) di tutti i testi UI
  
  ## 🏗️ Architettura
  - **Widget Dinamico (DB)**: Front Busta e Card Content configurabili via frontend-admin
  - **i18n Statico (JSON)**: Tutti i label/UI in `/i18n/it.json` e `/i18n/en.json`
  - **Backend**: Nuovo modello `ConfigurableText` + API endpoints
  - **Frontend-Admin**: Nuovo widget `TextConfigWidget` con WYSIWYG editor
  - **Frontend-User**: Context API per texts dinamici + i18n integration
  
  ## 📦 File Modificati
  ### Backend
  - `backend/core/models.py` (nuovo model `ConfigurableText`)
  - `backend/core/serializers.py` (nuovo serializer)
  - `backend/core/views.py` (nuovo ViewSet + public endpoint)
  - `backend/core/urls.py` (nuove routes)
  - `backend/core/management/commands/seed_configurable_texts.py` (seed data)
  
  ### Frontend-Admin
  - `frontend-admin/src/components/config/TextConfigWidget.jsx` (NEW)
  - `frontend-admin/src/pages/Configuration.jsx` (nuova sezione)
  - `frontend-admin/src/services/api.js` (nuovi metodi)
  - `frontend-admin/src/i18n.js` (NEW)
  
  ### Frontend-User
  - `frontend-user/src/contexts/TextContext.jsx` (NEW)
  - `frontend-user/src/services/textConfig.js` (NEW)
  - `frontend-user/src/components/invitation/LetterContent.jsx` (refactoring completo)
  - `frontend-user/src/i18n.js` (NEW)
  
  ### i18n Files
  - `/i18n/it.json` (NEW - 200+ chiavi)
  - `/i18n/en.json` (NEW - traduzioni complete)
  
  ### Docs
  - `docs/02-DATABASE.md` (aggiornato)
  - `docs/06-BACKEND-CORE.md` (aggiornato)
  - `docs/07-BACKEND-API.md` (aggiornato)
  - `docs/08-FRONTEND-USER-COMPONENTS.md` (aggiornato)
  - `docs/09-FRONTEND-ADMIN-COMPONENTS.md` (aggiornato)
  - `docs/API_DOCUMENTATION.md` (aggiornato)
  - `docs/USER_GUIDE_TEXT_CUSTOMIZATION.md` (NEW)
  - `docs/I18N_GUIDE.md` (NEW)
  - `AI_RULES.md` (aggiornato)
  
  ## 🧪 Testing
  - [x] Backend unit tests (pytest)
  - [x] Frontend-Admin component tests (Jest)
  - [x] Frontend-User component tests (Jest)
  - [x] Integration smoke test (Docker)
  - [x] Non-regression test (RSVP flow, animations, analytics)
  
  ## 📸 Screenshots
  [Inserire screenshot di TextConfigWidget in azione + Language Switcher]
  
  ## ⚠️ Breaking Changes
  Nessuno - backward compatible. Testi hardcoded esistono ancora come fallback.
  
  ## 🚀 Migration Plan
  1. Merge su `feat/text-customization-i18n`
  2. Testing su staging
  3. Applicare migration DB: `docker-compose exec backend python manage.py migrate`
  4. Seed texts: `docker-compose exec backend python manage.py seed_configurable_texts`
  5. Merge su `main`
  ```
- [ ] **Aggiungere label**: `enhancement`, `documentation`, `backend`, `frontend`, `i18n`

#### **8.3 Merge Strategy**
- [ ] **Creare Pull Request** da `feat/text-customization-i18n` verso `main`
- [ ] **Attendere approval** (reviewer + CI/CD pass)
- [ ] **Squash and merge** (messaggio: `feat: add dynamic text customization and full i18n support (#XX)`)
- [ ] **Tag release**: `v1.1.0-text-customization`
- [ ] **Delete branch** `feat/text-customization-i18n` dopo merge

---

## 🎯 **PRIORITÀ & DIPENDENZE**

### **Ordine di Implementazione Obbligatorio**:
1. **FASE 0** (i18n setup) - **PRIORITÀ MASSIMA** (base per tutto il resto)
2. **FASE 1** (Backend model + API) - **PRIORITÀ ALTA**
3. **FASE 5** (Database migration) - **BLOCKING STEP** (richiede approval esplicito)
4. **FASE 2** (Frontend-Admin widget) - dipende da FASE 1 + 5
5. **FASE 3** (Frontend-User refactoring) - dipende da FASE 0 + 1 + 5
6. **FASE 4** (Frontend-Admin i18n) - dipende da FASE 0
7. **FASE 6** (Testing) - dipende da tutte le fasi precedenti
8. **FASE 7** (Documentazione) - parallelo a implementazione
9. **FASE 8** (Pull Request) - finale

---

## 📊 **STIMA EFFORT**
- **FASE 0 (i18n setup)**: ~4-6 ore (creazione file JSON, setup i18next, language switcher)
- **FASE 1 (Backend)**: ~4-6 ore (model, serializer, ViewSet, endpoints)
- **FASE 2 (Frontend-Admin widget)**: ~8-10 ore (TextConfigWidget con WYSIWYG, emoji picker, integrazione)
- **FASE 3 (Frontend-User refactoring)**: ~6-8 ore (TextContext, refactoring LetterContent, altri componenti)
- **FASE 4 (Frontend-Admin i18n)**: ~4-6 ore (refactoring Configuration, Dashboard, InvitationList, ecc.)
- **FASE 5 (Database migration)**: ~1-2 ore (review, execution, seed)
- **FASE 6 (Testing)**: ~6-8 ore (unit, integration, non-regression)
- **FASE 7 (Documentazione)**: ~4-6 ore (update docs, user guides, API docs)
- **FASE 8 (Pull Request)**: ~1-2 ore (description, review, merge)
- **TOTALE STIMATO**: ~38-54 ore (~5-7 giorni lavorativi)

---

## 🔒 **GOVERNANCE & APPROVAL**

### **FASE 5 - Database Migration (REQUIRES EXPLICIT APPROVAL)**

#### **Schema Evolution Summary**:
- **Nuova Tabella**: `core_configurabletext`
- **Colonne**:
  - `id` (PK, auto-increment)
  - `key` (VARCHAR 255, UNIQUE, INDEXED)
  - `content` (TEXT)
  - `metadata` (JSONB)
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)
- **Impatto**: Nessuna modifica a tabelle esistenti (Invitation, Guest, Config, ecc.)
- **Backward Compatibility**: Totale - app continua a funzionare anche se tabella vuota (fallback su testi hardcoded)
- **Rollback Strategy**: 
  ```bash
  # Ottenere numero migration precedente
  docker-compose exec backend python manage.py showmigrations core
  
  # Rollback
  docker-compose exec backend python manage.py migrate core <previous_number>
  
  # Drop table manualmente (se necessario)
  docker-compose exec db psql -U wedding_user -d wedding_db -c "DROP TABLE IF EXISTS core_configurabletext CASCADE;"
  ```

#### **Pre-Migration Checklist**:
- [ ] ✅ Backup database eseguito
- [ ] ✅ Migration file reviewed (no destructive operations)
- [ ] ✅ Test migration su ambiente di sviluppo (success)
- [ ] ✅ Rollback strategy documentata
- [ ] ⏸️ **ATTENDERE APPROVAL ESPLICITO PRIMA DI PROCEDERE**

#### **Approval Request**:
```
🚨 DATABASE MIGRATION APPROVAL REQUEST

**Action**: Create new table `core_configurabletext`
**Impatto**: Low (no changes to existing tables)
**Rollback**: Available (tested)
**Backup**: Completed ✅

**Please approve to proceed with migration.**
```

---

## 📝 **NOTE FINALI**

### **Convenzioni Naming i18n Keys**:
- Pattern: `<context>.<subcontext>.<element>`
- Esempi:
  - `cards.alloggio.title`
  - `rsvp.steps.guests.title`
  - `admin.config.page_title`
  - `rsvp.validation.no_guests`

### **Font Options per Widget**:
- `serif` (Times New Roman, Georgia)
- `sans-serif` (Arial, Helvetica)
- `monospace` (Courier New, Consolas)
- `cursive` (Comic Sans, Brush Script)
- `fantasy` (Impact, Papyrus)

### **Size Options per Widget**:
- `h1` (2rem / 32px)
- `h2` (1.5rem / 24px)
- `h3` (1.25rem / 20px)
- `h4` (1rem / 16px)
- `p` (1rem / 16px)
- `small` (0.875rem / 14px)

### **Emoji Picker Library**:
- Libreria: `emoji-picker-react` (v4.x - latest stable)
- Documentazione: [npm](https://www.npmjs.com/package/emoji-picker-react)
- Props chiave: `onEmojiClick`, `theme`, `searchPlaceholder`

### **Security Considerations**:
- **XSS Prevention**: Sanitizzare HTML prima di `dangerouslySetInnerHTML` (libreria `DOMPurify`)
- **Admin-Only Access**: Endpoints `/admin/texts/` protetti con `IsAuthenticated`
- **Input Validation**: Limitare lunghezza `content` (max 10.000 caratteri)

---

## ✅ **COMPLETION CRITERIA**

La feature è considerata completa quando:
- [ ] Tutti i checkbox di tutte le fasi sono spuntati
- [ ] Pull Request merged su `main`
- [ ] Release tag `v1.1.0-text-customization` creata
- [ ] Documentazione aggiornata e disponibile in `/docs`
- [ ] Feature testata in produzione (staging)
- [ ] User feedback positivo su usabilità widget

---

## 📊 **STATUS TRACKING**

**Last Updated**: 2026-01-14 09:35 CET  
**Status**: 🟡 Ready to Start  
**Current Phase**: FASE 0 - i18n Infrastructure Setup  
**Progress**: 0/146 tasks completed (0%)  
**Blockers**: None  
**Next Step**: FASE 0.1 - Creare struttura file i18n (/i18n/it.json, /i18n/en.json)  

### **Commit History per Checklist Updates**:
```
2026-01-14 09:35 - docs: add golden rules and update instructions to checklist
2026-01-14 09:33 - docs: add comprehensive checklist for text customization and i18n implementation
```

---

**👉 Per iniziare l'implementazione, partire dalla FASE 0.1 e seguire rigorosamente le Regole Auree.**
