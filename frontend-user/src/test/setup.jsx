import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';

// Cleanup automatico dopo ogni test
afterEach(() => {
  cleanup();
});

// ========================================
// MOCK: react-i18next
// ========================================
vi.mock('react-i18next', () => ({
  useTranslation: () => {
    return {
      t: (key) => {
        // Mock translations (italiano) - Aligned with production keys
        const translations = {
          // Common
          'common.loading': 'Caricamento...',
          
          // Cards
          'cards.alloggio.title': 'Alloggio',
          'cards.alloggio.content_offered_default': '<p>Abbiamo riservato per voi...</p>',
          'cards.alloggio.content_general_default': '<p>Informazioni sull\'alloggio...</p>',
          'cards.viaggio.title': 'Viaggio',
          'cards.viaggio.content_default': '<p>Informazioni sul viaggio...</p>',
          'cards.evento.title': 'Evento',
          'cards.dresscode.title': 'Dress Code',
          'cards.dresscode.content_default': '<p>Beach Chic!</p>',
          'cards.bottino.title': 'Bottino',
          'cards.bottino.content_default': '<p>Lista nozze...</p>',
          'cards.cosaltro.title': "Cos'altro?",
          'cards.cosaltro.content_default': '<p>Altre informazioni...</p>',
          'cards.not_available.title': 'Contenuto non disponibile',
          
          // RSVP Card Status
          'rsvp.title': 'Conferma Presenza',
          'rsvp.status.pending.emoji': '⏳',
          'rsvp.status.pending.text': 'In Attesa',
          'rsvp.status.confirmed.emoji': '✅',
          'rsvp.status.confirmed.text': 'Confermato',
          'rsvp.status.declined.emoji': '❌',
          'rsvp.status.declined.text': 'Declinato',
          'rsvp.status.unknown.emoji': '❓',
          'rsvp.status.unknown.text': 'Sconosciuto',
          
          // RSVP Steps
          'rsvp.steps.summary.title': 'Il tuo RSVP',
          'rsvp.steps.guests.title': 'Conferma Ospiti',
          'rsvp.steps.contact.title': 'Numero di Contatto',
          'rsvp.steps.travel.title': 'Come Viaggerai?',
          'rsvp.steps.accommodation.title': 'Alloggio',
          'rsvp.steps.final.title': 'Conferma Finale',
          
          // RSVP Messages
          'rsvp.messages.already_confirmed': 'Hai già confermato la tua presenza!',
          'rsvp.messages.declined': 'Hai declinato l\'invito.',
          'rsvp.messages.not_specified': 'Non specificato',
          
          // RSVP Labels
          'rsvp.labels.summary': 'Riepilogo',
          'rsvp.labels.guests': 'Ospiti',
          'rsvp.labels.phone': 'Telefono',
          'rsvp.labels.transport': 'Trasporto',
          'rsvp.labels.accommodation': 'Alloggio',
          'rsvp.labels.schedule': 'Orari Viaggio',
          'rsvp.labels.schedule_placeholder': 'Partenza/Arrivo',
          'rsvp.labels.car': 'Auto',
          'rsvp.labels.name_placeholder': 'Nome',
          'rsvp.labels.lastname_placeholder': 'Cognome',
          'rsvp.labels.loading': 'Caricamento...',
          
          // RSVP Buttons
          'rsvp.buttons.next': 'Avanti →',
          'rsvp.buttons.back': '← Indietro',
          'rsvp.buttons.modify_answer': 'Modifica Risposta',
          'rsvp.buttons.confirm_presence': '✔️ Conferma Presenza',
          'rsvp.buttons.save_changes': 'Salva Modifiche',
          'rsvp.buttons.decline': 'Declina',
          
          // RSVP Options
          'rsvp.options.yes': 'Sì',
          'rsvp.options.no': 'No',
          'rsvp.options.ferry': 'Traghetto',
          'rsvp.options.plane': 'Aereo',
          'rsvp.options.car_with': 'Auto al seguito',
          'rsvp.options.car_rental': 'Noleggio Auto',
          'rsvp.options.carpool_interest': 'Sarebbe carino organizzarmi un passaggio',
          'rsvp.options.accommodation_question': 'Hai bisogno di alloggio?',
          'rsvp.options.accommodation_yes': 'Sì, richiedo l\'alloggio',
          
          // RSVP Validation
          'rsvp.validation.no_guests': 'Devi confermare almeno un ospite per procedere.',
          'rsvp.validation.phone_required': 'Il numero di telefono è obbligatorio.',
          'rsvp.validation.phone_invalid': 'Formato non valido. Inserisci un numero italiano valido.',
          'rsvp.validation.phone_empty': 'Inserisci un numero di telefono.',
          'rsvp.validation.travel_incomplete': 'Compila tutti i campi del viaggio per procedere.',
          
          // RSVP Guests
          'rsvp.guests.exclude_all_alert': 'Se non partecipi, ti preghiamo di contattarci.',
          
          // RSVP Success/Error
          'rsvp.success_message': 'RSVP inviato con successo!',
          'rsvp.error_message': 'Errore durante l\'invio del RSVP.',
          'rsvp.connection_error': 'Errore di connessione. Riprova più tardi.',
          
          // Badges
          'badges.child': 'Bambino',
          
          // WhatsApp
          'whatsapp.default_message': 'Ciao! Sono {guest_name}, ho una domanda per voi...',
          'whatsapp.alert_modify_confirmed': 'Se hai già confermato e vuoi modificare, contattaci.',
          'whatsapp.alert_confirm_after_decline': 'Hai declinato. Se vuoi confermare ora, contattaci.',
          
          // FAB
          'fab.aria_label_front': 'Gira invito',
          'fab.aria_label_back': 'Torna alla copertina',
          
          // Invitation Errors
          'invitation.errors.missing_params': 'Link non valido. Mancano i parametri di autenticazione.',
          'invitation.errors.invalid': 'Invito non valido',
          'invitation.errors.connection': 'Errore di connessione.',
          'invitation.errors.loading_failed': 'Errore caricamento invito',
        };
        
        return translations[key] || key;
      },
      i18n: {
        changeLanguage: vi.fn(),
        language: 'it',
      },
    };
  },
  Trans: ({ children }) => children,
  Translation: ({ children }) => children(() => {}),
}));

// ========================================
// MOCK: TextContext
// ========================================
const mockGetText = (key, defaultValue) => {
  // Simula il comportamento del TextProvider: restituisce HTML dal DB o fallback
  const dbTexts = {
    'envelope.front.content': '<div style="font-family: serif;"><h1>Domenico & Loredana</h1><p>Ci sposiamo il 19 Settembre 2026</p><p>Dress Code: Beach Chic</p></div>',
    // Le card usano i default se non presenti nel DB
  };
  
  return dbTexts[key] || defaultValue || '';
};

vi.mock('../contexts/TextContext', () => ({
  TextProvider: ({ children }) => children,
  useConfigurableText: () => ({
    getText: mockGetText,
    loading: false,
    error: null,
  }),
}));

// ========================================
// MOCK: textConfigService
// ========================================
vi.mock('../services/textConfig', () => ({
  textConfigService: {
    getAllTexts: vi.fn().mockResolvedValue([]), // Empty array by default
    getTextByKey: vi.fn().mockResolvedValue({ key: 'test', content: 'Test content' }),
  },
}));

// ========================================
// MOCK: analytics
// ========================================
vi.mock('../services/analytics', () => ({
  logInteraction: vi.fn().mockResolvedValue(undefined),
  heatmapTracker: {
    start: vi.fn(),
    stop: vi.fn(),
    flush: vi.fn(),
    handleMouseMove: vi.fn(),
  },
}));

// ========================================
// GLOBAL TEST HELPERS
// ========================================

// Wrapper per componenti che necessitano di provider
export const TestWrapper = ({ children }) => {
  return <>{children}</>;
};