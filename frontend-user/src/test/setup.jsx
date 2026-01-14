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
        // Mock translations (italiano)
        const translations = {
          // Common
          'common.loading': 'Caricamento...',
          
          // Cards
          'cards.alloggio.title': 'Alloggio',
          'cards.viaggio.title': 'Viaggio',
          'cards.evento.title': 'Evento',
          'cards.dress_code.title': 'Dress Code',
          'cards.bottino.title': 'Bottino',
          'cards.cosaltro.title': "Cos'altro?",
          'cards.rsvp.title': 'RSVP - Conferma Presenza',
          
          // RSVP Wizard Steps
          'rsvp.step1.title': 'Conferma Ospiti',
          'rsvp.step2.title': 'Numero di Contatto',
          'rsvp.step3.title': 'Come Viaggerai?',
          'rsvp.step4.title': 'Alloggio',
          'rsvp.step5.title': 'Conferma Finale',
          'rsvp.summary.title': 'Il tuo RSVP',
          'rsvp.summary.already_confirmed': 'Hai già confermato la tua presenza!',
          'rsvp.summary.modify_button': 'Modifica Risposta',
          
          // RSVP Step 1 (Guests)
          'rsvp.step1.child_label': 'Bambino',
          'rsvp.step1.name_placeholder': 'Nome',
          'rsvp.step1.surname_placeholder': 'Cognome',
          'rsvp.step1.error_no_guests': 'Devi confermare almeno un ospite per procedere.',
          
          // RSVP Step 2 (Contact)
          'rsvp.step2.phone_placeholder': '+39 333 1234567',
          'rsvp.step2.phone_error': 'Formato non valido. Inserisci un numero italiano valido.',
          
          // RSVP Step 3 (Travel)
          'rsvp.step3.transport.traghetto': 'Traghetto',
          'rsvp.step3.transport.aereo': 'Aereo',
          'rsvp.step3.car_option': 'Auto al seguito',
          'rsvp.step3.carpool_option': 'Sarebbe carino organizzarmi un passaggio',
          'rsvp.step3.schedule_placeholder': 'Partenza/Arrivo',
          'rsvp.step3.error_incomplete': 'Compila tutti i campi del viaggio per procedere.',
          
          // RSVP Step 4 (Accommodation)
          'rsvp.step4.yes': 'Sì, richiedo l\'alloggio',
          'rsvp.step4.no': 'No, ho già sistemazione',
          
          // RSVP Step 5 (Summary)
          'rsvp.step5.transport_label': 'Trasporto:',
          'rsvp.step5.transport.traghetto': 'traghetto',
          'rsvp.step5.transport.aereo': 'aereo',
          'rsvp.step5.confirm_button': '✔️ Conferma Presenza',
          
          // Navigation
          'rsvp.nav.next': 'Avanti →',
          'rsvp.nav.back': '← Indietro',
          
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
// GLOBAL TEST HELPERS
// ========================================

// Wrapper per componenti che necessitano di provider
export const TestWrapper = ({ children }) => {
  return <>{children}</>;
};