import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup automatico dopo ogni test
afterEach(() => {
  cleanup();
});

// Inform React that the test environment supports `act`.
// This silences warnings and enables React's internal act behavior.
// See: https://react.dev/warnings/act-missing
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// ========================================
// GLOBAL MOCKS: fetch & window.dispatchEvent
// ========================================
global.fetch = vi.fn();

Object.defineProperty(window, 'dispatchEvent', {
  value: vi.fn(),
  writable: true,
});

// ========================================
// TRADUZIONI COMPLETE DA i18n/it.json
// ========================================
import translations from '../../../i18n/it.json';

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
  Trans: ({ children }: any) => children,
  Translation: ({ children }: any) => children(() => { }),
}));

// ========================================
// Polyfills minimi per Tiptap / ProseMirror
// ========================================

// 1. createRange (JSDOM ce l'ha, ma lo rendiamo più permissivo)
if (!document.createRange) {
  document.createRange = () => ({
    setStart: () => { },
    setEnd: () => { },
    commonAncestorContainer: document.body,
  }) as any;
}

// 2. getSelection (fallback)
if (!window.getSelection) {
  window.getSelection = () => ({
    removeAllRanges: () => { },
    addRange: () => { },
  }) as any;
}

// 3. ResizeObserver (Tiptap lo usa)
class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
}
window.ResizeObserver = ResizeObserver;
// 1. Salva il metodo originale di JSDOM
const nativeCreateRange = document.createRange.bind(document);

document.createRange = () => {
  const range = nativeCreateRange();

  // 2. Aggiungi o correggi solo le proprietà problematiche per ProseMirror
  // Se getClientRects manca o crasha, lo mockiamo
  if (!range.getClientRects) {
    range.getClientRects = () => {
      const rects: DOMRect[] = [];
      return {
        item: (index: number) => rects[index] || null,
        length: rects.length,
        // Usiamo l'iteratore nativo di un array vuoto per soddisfare TypeScript
        [Symbol.iterator]: () => rects[Symbol.iterator]()
      } as unknown as DOMRectList; // Cast per evitare conflitti con DOMRectList
    };
  }

  if (!range.getBoundingClientRect) {
    range.getBoundingClientRect = () => ({
      bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0,
      x: 0, y: 0, toJSON: () => { }
    });
  }

  return range;
};

// 3. Sistema anche elementFromPoint se non esiste (fondamentale per il tuo errore)
if (!document.elementFromPoint) {
  document.elementFromPoint = () => document.body;
}

// ========================================
// Polyfill: window.matchMedia (required by react-hot-toast)
// ========================================
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});