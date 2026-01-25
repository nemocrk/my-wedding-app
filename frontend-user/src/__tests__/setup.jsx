import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';

// Cleanup automatico dopo ogni test
afterEach(() => {
  cleanup();
});

// ========================================
// TRADUZIONI COMPLETE DA i18n/it.json
// ========================================
import translations from '../../../i18n/it.json';

// Helper per navigare oggetti nested con dot notation
const getNestedTranslation = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path;
};

// ========================================
// MOCK: react-i18next
// ========================================
vi.mock('react-i18next', () => ({
  useTranslation: () => {
    return {
      t: (key, options) => {
        let translation = getNestedTranslation(translations, key);
        
        // Handle interpolation {variable}
        if (options && typeof translation === 'string') {
          Object.keys(options).forEach(varName => {
            translation = translation.replace(
              new RegExp(`\\{\\{${varName}\\}\\}`, 'g'),
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