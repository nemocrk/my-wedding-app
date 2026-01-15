import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

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
      t: (key: string) => {
        // Mappa completa delle traduzioni usate in frontend-admin
        const translations: Record<string, string> = {
          // Dashboard
          'admin.dashboard.loading': 'Caricamento dashboard...',
          'admin.dashboard.error': 'Impossibile caricare le statistiche.',
          'admin.dashboard.title': 'Dashboard',
          'admin.dashboard.guests.confirmed': 'Confermati',
          'admin.dashboard.guests.pending': 'In Attesa',
          'admin.dashboard.guests.declined': 'Declinati',
          'admin.dashboard.guests.children_suffix': 'di cui {count} bambini',
          'admin.dashboard.financials.confirmed': 'Confermato',
          'admin.dashboard.financials.estimated': 'Stimato',
          'admin.dashboard.logistics.accommodation': 'Alloggi',
          'admin.dashboard.logistics.transfer': 'Transfer',
          'admin.dashboard.charts.guest_status': 'Stato Ospiti',
          
          // Config
          'admin.config.title': 'Configurazione',
          'admin.config.save': 'Salva Modifiche',
          'admin.config.saving': 'Salvataggio...',
          
          // Invitations
          'admin.invitations.title': 'Inviti',
          'admin.invitations.create': 'Nuovo Invito',
          'admin.invitations.loading': 'Caricamento inviti...',
          'admin.invitations.error': 'Errore nel caricamento degli inviti',
          
          // Common
          'common.loading': 'Caricamento...',
          'common.error': 'Errore',
          'common.save': 'Salva',
          'common.cancel': 'Annulla',
          'common.delete': 'Elimina',
          'common.edit': 'Modifica',
          'common.close': 'Chiudi',
          'common.confirm': 'Conferma',
        };
        
        // Restituisce la traduzione o la chiave stessa se non trovata
        return translations[key] || key;
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
