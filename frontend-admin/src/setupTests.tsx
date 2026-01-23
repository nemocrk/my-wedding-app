import React from 'react';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';


// Cleanup automatico dopo ogni test
afterEach(() => {
  cleanup();
});

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
import translations from '../../i18n/it.json';

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
  Translation: ({ children }: any) => children(() => {}),
}));

// ========================================
// MOCK: @tiptap/react (TipTap Editor)
// ========================================
vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => ({
    getHTML: () => '<p>Mocked HTML</p>',
    commands: {
      setContent: vi.fn(),
      focus: vi.fn(),
    },
    chain: () => ({
      focus: () => ({ 
        undo: () => ({ run: vi.fn() }),
        redo: () => ({ run: vi.fn() }),
        setFontFamily: () => ({ run: vi.fn() }),
        setFontSize: () => ({ run: vi.fn() }),
        setColor: () => ({ run: vi.fn() }),
        setRotation: () => ({ run: vi.fn() }),
        toggleBold: () => ({ run: vi.fn() }),
        toggleItalic: () => ({ run: vi.fn() }),
        toggleStrike: () => ({ run: vi.fn() }),
        toggleCode: () => ({ run: vi.fn() }),
        toggleUnderline: () => ({ run: vi.fn() }),
        setTextAlign: () => ({ run: vi.fn() }),
      }),
    }),
    can: () => ({
      chain: () => ({ 
        focus: () => ({ 
          undo: () => ({ run: () => false }),
          redo: () => ({ run: () => false }),
        }),
      }),
    }),
    on: vi.fn(),
    off: vi.fn(),
    isActive: vi.fn(() => false),
    getAttributes: vi.fn(() => ({})),
  })),
  EditorContent: ({ children }: any) => <div data-testid="editor-content">{children}</div>,
  // CRITICAL: Export Extension, Mark, mergeAttributes
  Extension: {
    create: vi.fn(() => ({
      name: 'mockExtension',
      addOptions: vi.fn(),
      addGlobalAttributes: vi.fn(),
      addCommands: vi.fn(),
    })),
  },
  Mark: {
    create: vi.fn(() => ({
      name: 'mockMark',
      addOptions: vi.fn(),
      addAttributes: vi.fn(),
      parseHTML: vi.fn(),
      renderHTML: vi.fn(),
      addCommands: vi.fn(),
    })),
  },
  mergeAttributes: vi.fn((...attrs) => Object.assign({}, ...attrs)),
}));

// ========================================
// MOCK: TipTap Extensions
// ========================================
vi.mock('@tiptap/starter-kit', () => ({ 
  default: { configure: vi.fn(() => ({ name: 'StarterKit' })) } 
}));
vi.mock('@tiptap/extension-link', () => ({ default: vi.fn() }));
vi.mock('@tiptap/extension-underline', () => ({ default: vi.fn() }));
vi.mock('@tiptap/extension-text-align', () => ({ 
  default: { configure: vi.fn(() => ({ name: 'TextAlign' })) } 
}));
vi.mock('@tiptap/extension-subscript', () => ({ default: vi.fn() }));
vi.mock('@tiptap/extension-superscript', () => ({ default: vi.fn() }));
vi.mock('@tiptap/extension-highlight', () => ({ default: vi.fn() }));
vi.mock('@tiptap/extension-text-style', () => ({ TextStyle: vi.fn() }));
vi.mock('@tiptap/extension-color', () => ({ Color: vi.fn() }));
vi.mock('@tiptap/extension-font-family', () => ({ default: vi.fn() }));

// ========================================
// MOCK: GoogleFontPicker
// ========================================
vi.mock('../components/ui/GoogleFontPicker', () => ({
  default: () => <div data-testid="google-font-picker">Font Picker</div>,
}));

// ========================================
// MOCK: fontLoader
// ========================================
vi.mock('../utils/fontLoader', () => ({
  autoLoadFontsFromHTML: vi.fn(),
}));
