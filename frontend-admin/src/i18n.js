import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

// Definizione locale delle traduzioni italiane per evitare problemi di loading asincrono in questo contesto specifico
const resources = {
  it: {
    translation: {
      common: {
        loading: "Caricamento...",
        error_occurred: "Si è verificato un errore",
        save: "Salva",
        cancel: "Annulla",
        delete: "Elimina",
        confirm: "Conferma"
      },
      admin: {
        dashboard: {
            title: "Dashboard"
        },
        invitations: {
            page_title: "Gestione Inviti",
            page_subtitle: "Gestisci gli ospiti e invia i messaggi WhatsApp",
            buttons: {
                new_invitation: "Nuovo Invito",
                import_contacts: "Importa Rubrica",
                deselect_all: "Deseleziona tutti",
                verify_contacts: "Verifica Contatti",
                send_whatsapp: "Invia WhatsApp"
            },
            filters: {
                title: "Filtri",
                search_placeholder: "Cerca per nome...",
                all_statuses: "Tutti gli stati",
                all_labels: "Tutte le etichette"
            },
            table: {
                headers: {
                    name_origin: "Nome & Lato",
                    contact: "Contatto",
                    guests: "Ospiti",
                    status: "Stato",
                    actions: "Azioni"
                }
            },
            status: {
                imported: "Importato",
                created: "Creato",
                sent: "Inviato",
                read: "Letto",
                confirmed: "Confermato",
                declined: "Rifiutato",
                unknown: "Sconosciuto"
            },
            origin: {
                bride: "Sposa",
                groom: "Sposo"
            },
            verification: {
                ok: "OK",
                not_present: "Non presente",
                not_exist: "Non esiste",
                not_valid: "Non valido",
                verifying: "Verifica in corso...",
                click_to_verify: "Clicca per verificare"
            },
            contact: {
                no_contact: "Nessun contatto"
            },
            services: {
                accommodation: "Alloggio",
                transfer: "Navetta"
            },
            actions: {
                send: "Segna come Inviato",
                send_whatsapp: "Invia Messaggio WhatsApp",
                contact_missing: "Contatto mancante o non valido",
                interaction_log: "Log Interazioni",
                copy_link: "Copia Link Invito",
                link_copied: "Link Copiato!",
                preview: "Anteprima Invito",
                edit: "Modifica",
                delete: "Elimina"
            },
            alerts: {
                verify_failed: "Verifica fallita",
                bulk_verify_complete: "Verifica completata per {{count}} contatti",
                bulk_verify_failed: "Verifica massiva fallita",
                no_valid_contacts: "Nessun contatto valido selezionato",
                some_invalid: "{{count}} su {{total}} contatti non sono validi. Vuoi procedere solo con quelli validi?",
                invalid_contact: "Il contatto non è valido per l'invio WhatsApp",
                delete_failed: "Eliminazione fallita"
            },
            bulk_action: {
                selected: "{{count}} selezionati"
            },
            no_invitations: "Nessun invito trovato",
            no_invitations_subtitle: "Crea il primo invito",
            loading: "Caricamento inviti...",
            delete_modal: {
                title: "Elimina Invito",
                message: "Sei sicuro di voler eliminare questo invito? L'azione è irreversibile.",
                confirm: "Elimina",
                cancel: "Annulla"
            },
            create_modal: {
                title: "Crea Nuovo Invito",
                step_of: "Passo {{step}} di {{total}}",
                steps: {
                    details: {
                        title: "Dettagli Principali",
                        side_groom: "Lato Sposo",
                        side_bride: "Lato Sposa",
                        display_name: "Nome Visualizzato",
                        display_name_placeholder: "es. Famiglia Rossi",
                        unique_code: "Codice Univoco",
                        unique_code_placeholder: "es. ROSSI2024",
                        phone_number: "Numero di Telefono",
                        phone_placeholder: "es. +39 333 1234567",
                        phone_hint: "Necessario per l'invio via WhatsApp",
                        offered_options: "Opzioni Offerte",
                        accommodation_offered: "Alloggio Offerto",
                        transfer_offered: "Navetta Offerta",
                        labels: "Etichette",
                        no_labels: "Nessuna etichetta disponibile. Creale dalla gestione etichette.",
                        validation: {
                            name_code_required: "Nome e Codice sono obbligatori"
                        }
                    },
                    guests: {
                        title: "Lista Ospiti",
                        add_guest: "Aggiungi Ospite",
                        name_label: "Nome",
                        name_placeholder: "Nome",
                        lastname_label: "Cognome",
                        lastname_placeholder: "Cognome",
                        child_checkbox: "Bambino (0-10)",
                        validation: {
                            min_one: "Inserisci almeno un nome per ogni ospite"
                        }
                    },
                    review: {
                        title: "Affinità Tavoli",
                        no_other_invites: "Non ci sono ancora altri inviti con cui creare affinità.",
                        affinity_title: "Affini (Vicina di tavolo)",
                        non_affinity_title: "Non Affini (Lontano)"
                    }
                },
                buttons: {
                    back: "Indietro",
                    next: "Avanti",
                    create: "Crea Invito",
                    saving: "Salvataggio..."
                }
            }
        },
        labels: {
            title: "Gestione Etichette",
            subtitle: "Organizza gli invitati con tag personalizzati",
            new_label: "Nuova Etichetta",
            no_labels: "Nessuna etichetta trovata",
            create_title: "Nuova Etichetta",
            edit_title: "Modifica Etichetta",
            table: {
                preview: "Anteprima",
                name: "Nome",
                color: "Codice Colore",
                actions: "Azioni"
            },
            form: {
                name: "Nome Etichetta",
                color: "Colore"
            },
            delete_modal: {
                title: "Elimina Etichetta",
                message: "Sei sicuro? Questa azione rimuoverà l'etichetta da tutti gli inviti associati."
            }
        }
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'it',
    fallbackLng: 'it',
    interpolation: {
      escapeValue: false 
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;
