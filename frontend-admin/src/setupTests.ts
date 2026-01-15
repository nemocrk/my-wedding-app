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
      t: (key: string) => key, // Mock semplice: restituisce la chiave stessa
      i18n: {
        changeLanguage: vi.fn(),
        language: 'it',
      },
    };
  },
  Trans: ({ children }: any) => children,
  Translation: ({ children }: any) => children(() => {}),
}));
