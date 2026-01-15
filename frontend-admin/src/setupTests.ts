import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup automatico dopo ogni test
afterEach(() => {
  cleanup();
});

// ========================================
// TRADUZIONI COMPLETE DA i18n/it.json
// ========================================
const translations = {
  "common": {
    "loading": "Caricamento...",
    "yes": "Sì",
    "no": "No",
    "cancel": "Annulla",
    "save": "Salva",
    "close": "Chiudi",
    "error_modal": {
      "title": "Ops! Qualcosa non va",
      "button": "Ho capito, chiudi",
      "default_user_message": "Non siamo riusciti a completare l'operazione richiesta.",
      "hide_technical_data": "Nascondi dettagli tecnici",
      "show_technical_data": "Mostra dettagli errore"
    }
  },
  "admin": {
    "sidebar": {
      "app_title": "Wedding",
      "app_title_accent": "Admin",
      "nav": {
        "dashboard": "Dashboard",
        "invitations": "Inviti",
        "accommodations": "Alloggi",
        "whatsapp": "WhatsApp",
        "configuration": "Configurazione"
      },
      "logout": "Logout"
    },
    "config": {
      "page_title": "Configurazione",
      "page_subtitle": "Gestisci prezzi, testi e sicurezza dell'applicazione",
      "loading": "Caricamento configurazione...",
      "save_button": "Salva Modifiche",
      "saving": "Salvataggio...",
      "success_message": "Configurazione salvata con successo!",
      "error_message": "Errore durante il salvataggio.",
      "error_load": "Errore caricamento configurazione.",
      "dynamic_texts_title": "Contenuti Dinamici",
      "dynamic_texts_subtitle": "Gestisci i testi configurabili visualizzati nelle card dell'invito utente"
    },
    "sections": {
      "prices": {
        "title": "Gestione Costi Unitari",
        "adult_meal": "Pranzo Adulti (€)",
        "child_meal": "Pranzo Bambini (€)",
        "accommodation_adult": "Alloggio Adulti (€)",
        "accommodation_child": "Alloggio Bambini (€)",
        "transfer": "Transfer per persona (€)"
      },
      "texts": {
        "title": "Testi e Comunicazioni",
        "letter_template": "Template Lettera di Benvenuto",
        "available_vars": "Disponibili: {guest_names}, {family_name}, {code}",
        "placeholder": "Inserisci qui il testo..."
      },
      "security": {
        "title": "Sicurezza Link Pubblici",
        "secret_key": "Chiave Segreta per Link",
        "secret_warning": "(ATTENZIONE: Modificando questo valore, tutti i link inviati precedentemente smetteranno di funzionare)",
        "unauthorized_message": "Messaggio di Errore (Link Scaduto/Invalido)"
      },
      "whatsapp": {
        "title": "Configurazione WhatsApp",
        "rate_limit": "Rate Limit (messaggi/ora)",
        "rate_limit_hint": "Limite di sicurezza per sessione (Anti-Ban)",
        "rate_limit_note": "Valore consigliato: 10 msg/ora. Non superare 20 per evitare ban da WhatsApp.",
        "placeholder_rate": "10"
      }
    },
    "dashboard": {
      "page_title": "Dashboard",
      "page_subtitle": "Panoramica dello stato del matrimonio",
      "loading": "Caricamento dashboard...",
      "error": "Impossibile caricare le statistiche.",
      "kpi": {
        "confirmed_guests": "Ospiti Confermati",
        "confirmed_guests_subtitle": "di cui {count} bambini",
        "estimated_budget": "Budget Stimato (Max)",
        "estimated_budget_subtitle": "Se tutti i pending accettano",
        "current_cost": "Costo Attuale (Reale)",
        "current_cost_subtitle": "Solo confermati",
        "pending": "In Attesa",
        "pending_subtitle": "Risposte mancanti"
      },
      "charts": {
        "guests_status": "Stato Ospiti",
        "logistics_costs": "Dettaglio Logistica & Costi",
        "cost_breakdown": "Breakdown Costi (Confermati)",
        "current_total": "Totale Attuale"
      },
      "guest_categories": {
        "adults_confirmed": "Adulti Confermati",
        "children_confirmed": "Bambini Confermati",
        "adults_pending": "Adulti In Attesa",
        "children_pending": "Bambini In Attesa",
        "declined": "Declinati"
      },
      "logistics": {
        "accommodation": "Alloggi",
        "accommodation_subtitle": "Posti letto richiesti",
        "transfer": "Transfer",
        "transfer_subtitle": "Posti bus richiesti"
      },
      "costs": {
        "adult_meals": "Pasti Adulti ({count})",
        "child_meals": "Pasti Bambini ({count})"
      }
    },
    "invitations": {
      "page_title": "Censimento Inviti",
      "page_subtitle": "Gestisci la lista degli invitati e i codici di accesso",
      "loading": "Caricamento inviti...",
      "no_invitations": "Nessun invito presente",
      "no_invitations_subtitle": "Crea il tuo primo invito",
      "buttons": {
        "import_contacts": "Importa Contatti",
        "new_invitation": "Nuovo Invito",
        "deselect_all": "Deseleziona",
        "verify_contacts": "Verifica Contatti",
        "send_whatsapp": "Invia WhatsApp"
      },
      "bulk_action": {
        "selected": "{count} Selezionati"
      },
      "table": {
        "headers": {
          "name_origin": "Nome & Origine",
          "contact": "Contatto",
          "guests": "Ospiti",
          "status": "Stato",
          "actions": "Azioni"
        }
      },
      "status": {
        "imported": "Importato",
        "created": "Creato",
        "sent": "Inviato",
        "read": "Letto",
        "confirmed": "Accettato",
        "declined": "Declinato",
        "unknown": "Sconosciuto"
      },
      "verification": {
        "ok": "Verificato (OK)",
        "not_present": "Non in rubrica",
        "not_exist": "Non esiste su WhatsApp",
        "not_valid": "Da verificare / Formato errato",
        "verifying": "Verifica in corso...",
        "click_to_verify": "Clicca per verificare"
      },
      "contact": {
        "no_contact": "Nessun Contatto"
      },
      "origin": {
        "bride": "Lato Sposa",
        "groom": "Lato Sposo"
      },
      "actions": {
        "send": "Invia",
        "send_whatsapp": "Invia WhatsApp",
        "contact_missing": "Contatto mancante o invalido",
        "interaction_log": "Log Interazioni",
        "copy_link": "Copia Link Pubblico",
        "link_copied": "Link Copiato!",
        "preview": "Apri Anteprima Sicura",
        "edit": "Modifica",
        "delete": "Elimina"
      },
      "services": {
        "accommodation": "Alloggio",
        "transfer": "Transfer"
      },
      "alerts": {
        "no_valid_contacts": "Nessuno degli inviti selezionati ha un numero valido.",
        "some_invalid": "{count} inviti su {total} non hanno un numero valido e saranno saltati. Procedere?",
        "invalid_contact": "Numero non valido per questo contatto.",
        "verify_failed": "Errore durante la verifica del contatto.",
        "bulk_verify_complete": "Verifica completata per {count} inviti.",
        "bulk_verify_failed": "Alcune verifiche sono fallite. Controlla la console.",
        "delete_failed": "Impossibile eliminare l'invito"
      },
      "delete_modal": {
        "title": "Elimina Invito",
        "message": "Sei sicuro di voler eliminare questo invito? Questa azione rimuoverà tutti gli ospiti associati.",
        "confirm": "Sì, elimina",
        "cancel": "Annulla"
      }
    },
    "whatsapp_config": {
      "page_title": "Integrazione WhatsApp",
      "tabs": {
        "connection": "Connessione & Stato",
        "templates": "Template Messaggi"
      },
      "connection": {
        "groom_account": "Account Sposo",
        "bride_account": "Account Sposa",
        "status": {
          "loading": "Caricamento...",
          "connected": "Connesso",
          "disconnected": "Disconnesso",
          "error": "Errore"
        },
        "profile_name": "Utente WhatsApp",
        "last_check": "Ultimo controllo:",
        "never": "Mai",
        "buttons": {
          "verify_status": "Verifica Stato",
          "connect_account": "Collega Account",
          "disconnect": "Disconnetti Sessione",
          "send_test": "Invia Messaggio di Test"
        },
        "alerts": {
          "disconnect_confirm": "Sei sicuro di voler disconnettere questa sessione?",
          "test_success": "Messaggio inviato con successo a {recipient}! Controlla il telefono.",
          "test_error": "Errore invio messaggio test:"
        },
        "notes": {
          "title": "Note Importanti Anti-Ban",
          "rule_1": "Non inviare mai messaggi a contatti che non hanno scritto per primi.",
          "rule_2": "Il sistema simula la digitazione umana (typing...) prima di ogni invio.",
          "rule_3": "È attivo un limite di sicurezza di 10 messaggi/ora per sessione."
        }
      },
      "qr_modal": {
        "title": "Scansiona QR Code ({session})",
        "generating": "Generazione QR Code in corso...",
        "instructions": "Apri WhatsApp sul telefono > Impostazioni > Dispositivi collegati > Collega un dispositivo",
        "close": "Chiudi"
      },
      "templates": {
        "title": "Gestione Template Messaggi",
        "new_template": "Nuovo Template",
        "no_templates": "Nessun template configurato.",
        "create_now": "Creane uno ora",
        "types": {
          "automatic": "Automatico",
          "manual": "Manuale (Spot)"
        },
        "status": {
          "inactive": "Inattivo"
        },
        "trigger": "Trigger: Cambio stato in",
        "modal": {
          "title_create": "Nuovo Template",
          "title_edit": "Modifica Template",
          "fields": {
            "name": "Nome Template",
            "name_placeholder": "es. Conferma Ricezione",
            "type": "Tipo",
            "type_manual": "Manuale (Spot)",
            "type_auto": "Automatico (Cambio Stato)",
            "trigger_status": "Attiva quando lo stato diventa:",
            "trigger_select": "-- Seleziona Stato --",
            "trigger_sent": "Inviato (Sent)",
            "trigger_read": "Letto (Read)",
            "trigger_confirmed": "Accettato (Confirmed)",
            "trigger_declined": "Declinato (Declined)",
            "content": "Contenuto Messaggio",
            "content_placeholder": "Ciao {name}, ecco il tuo invito...",
            "is_active": "Template Attivo"
          },
          "placeholders": {
            "name": "Nome",
            "link": "Link",
            "code": "Codice"
          },
          "buttons": {
            "cancel": "Annulla",
            "save": "Salva Template"
          }
        },
        "delete_confirm": "Sei sicuro di voler eliminare questo template?"
      }
    },
    "accommodations": {
      "page_title": "Gestione Alloggi",
      "page_subtitle": "Configura le strutture ricettive e assegna gli ospiti.",
      "buttons": {
        "auto_assign": "Auto Assign (Arena)",
        "new_accommodation": "Nuovo Alloggio"
      },
      "success": {
        "created": "Alloggio creato con successo!",
        "deleted": "Alloggio eliminato.",
        "assigned": "Assegnazione completata! {count} invitati assegnati con la strategia scelta."
      },
      "alerts": {
        "delete_confirm": "Sei sicuro di voler eliminare questo alloggio?",
        "unassigned_warning": "Attenzione: {count} gruppi/inviti non assegnati",
        "adults": "Adulti",
        "children": "Bambini"
      },
      "close_success": "Chiudi"
    }
  }
};

// Helper per navigare oggetti nested con dot notation
const getNestedTranslation = (obj: any, path: string): string => {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path;
};

// ========================================
// MOCK: react-i18next
// ========================================
vi.mock('react-i18next', () => ({
  useTranslation: () => {
    return {
      t: (key: string, options?: any) => {
        let translation = getNestedTranslation(translations, key);
        
        // Handle interpolation {variable}
        if (options && typeof translation === 'string') {
          Object.keys(options).forEach(varName => {
            translation = translation.replace(
              new RegExp(`\\{${varName}\\}`, 'g'),
              options[varName]
            );
          });
        }
        
        return translation;
      },
      i18n: {
        changeLanguage: vi.fn(),
        language: 'it',
      },
    };
  },
  Trans: ({ children }: any) => children,
  Translation: ({ children }: any) => children(() => {}),
}));
