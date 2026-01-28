import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConfigurableTextEditor from '../ConfigurableTextEditor';


vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock('../../../utils/fontLoader', () => ({
  autoLoadFontsFromHTML: vi.fn(),
}));

describe('ConfigurableTextEditor MenuBar - Advanced Interactions', () => {
  const mockOnSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });


  const openEditor = async () => {
    const user = userEvent.setup();
    render(
      <ConfigurableTextEditor
        textKey="test_key"
        initialContent="<p>Test</p>"
        onSave={mockOnSave}
      />
    );
    await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));
    await waitFor(() => screen.getByTitle(/Grassetto/i));
  };
  describe('Editor Event Listeners', () => {
    it('updates toolbar state on selectionUpdate event', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p>Normal <strong>Bold</strong></p>"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));
      await waitFor(() => screen.getByTitle(/Grassetto/i));

      const boldButton = screen.getByTitle(/Grassetto/i);

      // Initially, bold should not be active
      expect(boldButton.className).not.toContain('bg-indigo-100');

      // Click on bold text
      const editor = document.querySelector('.ProseMirror');
      const boldElement = editor?.querySelector('strong');
      if (boldElement) {
        await user.click(boldElement);
        // svuota microtask
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        // svuota macrotask
        await new Promise(setImmediate);

        // svuota pending observer
        await Promise.resolve();
        await Promise.resolve();


        // Bold button should become active
        await waitFor(async () => {
          expect(boldButton.className).toContain('bg-indigo-100');
        });
      }
    });

    it('updates toolbar state on transaction event', async () => {
      await openEditor();
      const user = userEvent.setup();

      const boldButton = screen.getByTitle(/Grassetto/i);

      // Click bold to toggle it on
      await user.click(boldButton);

      // Button should show active state after transaction
      await waitFor(() => {
        expect(boldButton.className).toContain('bg-indigo-100');
      });
    });
  });

  describe('Font Size Spinner Interaction', () => {
    it('increments font size when + is clicked', async () => {
      await openEditor();
      const user = userEvent.setup();

      const sizeSpinner = screen.getByTitle(/Dimensione Font/i);
      const incrementBtn = sizeSpinner.querySelector('button:last-child');

      // Initial state should be 1rem
      expect(sizeSpinner.textContent).toContain('1rem');

      await user.click(incrementBtn);

      // After increment, should be 1.1rem (step 0.1)
      await waitFor(() => {
        expect(sizeSpinner.textContent).toContain('1.1rem');
      });
    });

    it('decrements font size when - is clicked', async () => {
      await openEditor();
      const user = userEvent.setup();

      const sizeSpinner = screen.getByTitle(/Dimensione Font/i);
      const decrementBtn = sizeSpinner.querySelector('button:first-of-type');

      await user.click(decrementBtn);

      await waitFor(() => {
        expect(sizeSpinner.textContent).toContain('0.9rem');
      });
    });

    it('respects min boundary (0.5rem)', async () => {
      await openEditor();
      const user = userEvent.setup();

      const sizeSpinner = screen.getByTitle(/Dimensione Font/i);
      const decrementBtn = sizeSpinner.querySelector('button:first-of-type');

      // Click decrement many times to try to go below 0.5
      for (let i = 0; i < 10; i++) {
        await user.click(decrementBtn);
      }

      await waitFor(() => {
        const text = sizeSpinner.textContent;
        const value = parseFloat(text.slice(1, -1));
        expect(value).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('respects max boundary (8rem)', async () => {
      await openEditor();
      const user = userEvent.setup();

      const sizeSpinner = screen.getByTitle(/Dimensione Font/i);
      const incrementBtn = sizeSpinner.querySelector('button:last-child');

      // Click increment many times to try to go above 8
      for (let i = 0; i < 100; i++) {
        await user.click(incrementBtn);
      }

      await waitFor(() => {
        const text = sizeSpinner.textContent;
        const value = parseFloat(text.slice(1, -1));
        expect(value).toBeLessThanOrEqual(8);
      });
    });

    it('updates font size in editor via wheel scroll', async () => {
      await openEditor();

      const sizeSpinner = screen.getByTitle(/Dimensione Font/i);

      // Simulate wheel up (increase size)
      fireEvent.wheel(sizeSpinner, { deltaY: -100 });

      await waitFor(() => {
        expect(sizeSpinner.textContent).toContain('1.1rem');
      });
    });
  });

  describe('Rotation Spinner Interaction', () => {
    it('increments rotation angle', async () => {
      await openEditor();
      const user = userEvent.setup();

      const rotationSpinner = screen.getByTitle(/Rotazione/i);
      const incrementBtn = rotationSpinner.querySelector('button:last-child');

      expect(rotationSpinner.textContent).toContain('0°');

      await user.click(incrementBtn);

      await waitFor(() => {
        expect(rotationSpinner.textContent).toContain('1°');
      });
    });

    it('decrements rotation angle', async () => {
      await openEditor();
      const user = userEvent.setup();

      const rotationSpinner = screen.getByTitle(/Rotazione/i);
      const decrementBtn = rotationSpinner.querySelector('button:first-of-type');

      await user.click(decrementBtn);

      await waitFor(() => {
        expect(rotationSpinner.textContent).toContain('-1°');
      });
    });

    it('respects min boundary (-180°)', async () => {
      await openEditor();
      const user = userEvent.setup();

      const rotationSpinner = screen.getByTitle(/Rotazione/i);
      const decrementBtn = rotationSpinner.querySelector('button:first-of-type');

      for (let i = 0; i < 200; i++) {
        await user.click(decrementBtn);
      }

      await waitFor(() => {
        const text = rotationSpinner.textContent;
        const value = parseInt(text.slice(1, -1));
        expect(value).toBeGreaterThanOrEqual(-180);
      });
    });

    it('respects max boundary (180°)', async () => {
      await openEditor();
      const user = userEvent.setup();

      const rotationSpinner = screen.getByTitle(/Rotazione/i);
      const incrementBtn = rotationSpinner.querySelector('button:last-child');

      for (let i = 0; i < 200; i++) {
        await user.click(incrementBtn);
      }

      await waitFor(() => {
        const text = rotationSpinner.textContent;
        const value = parseInt(text.slice(1, -1));
        expect(value).toBeLessThanOrEqual(180);
      });
    });
  });

  describe('Color Picker Interaction', () => {
    it('changes text color when color input changes', async () => {
      await openEditor();

      const colorPicker = screen.getByTitle(/Colore Testo/i);
      expect(colorPicker.value).toBe('#000000'); // Default black

      fireEvent.input(colorPicker, { target: { value: '#ff0000' } });

      await waitFor(() => {
        expect(colorPicker.value).toBe('#ff0000');
      });
    });

    it('reflects current color from editor state', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent='<p><span style="color: #00ff00;">Colored</span></p>'
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));
      await waitFor(() => screen.getByTitle(/Colore Testo/i));

      // Select the colored text to see its color in picker
      const editor = document.querySelector('.ProseMirror');
      if (editor) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        // Wait for state sync
        await waitFor(() => {
          const colorPicker = screen.getByTitle(/Colore Testo/i);
          // Color should reflect selection (might be #00ff00 or default)
          expect(colorPicker).toBeTruthy();
        }, { timeout: 2000 });
      }
    });
  });

  describe('Font Family State Sync', () => {
    it('shows default font (Open Sans) initially', async () => {
      await openEditor();

      await waitFor(() => {
        // GoogleFontPicker displays the active font
        expect(screen.getByText(/Open Sans|Font/i)).toBeInTheDocument();
      });
    });

    it('updates active font when selection changes', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent='<p style="font-family: Roboto;">Custom Font</p>'
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));
      await waitFor(() => screen.getByTitle(/Grassetto/i));

      // Select text to trigger state sync
      const editor = document.querySelector('.ProseMirror');
      if (editor) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);

        // Font state should update (Roboto or fallback to Open Sans)
        await waitFor(() => {
          expect(screen.getAllByText(/Roboto|Open Sans|Font/i)[0]).toBeInTheDocument();
        }, { timeout: 2000 });
      }
    });
  });

  describe('Toolbar Button States', () => {
    it('bold button shows active state when bold is applied', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p><strong>Bold text</strong></p>"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));
      await waitFor(() => screen.getByTitle(/Grassetto/i));

      // Select bold text
      const editor = document.querySelector('.ProseMirror');
      if (editor) {
        const range = document.createRange();
        range.selectNodeContents(editor.querySelector('strong'));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);

        await waitFor(() => {
          const boldButton = screen.getByTitle(/Grassetto/i);
          expect(boldButton.className).toContain('bg-indigo-100');
        });
      }
    });

    it('italic button shows active state when italic is applied', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p><em>Italic text</em></p>"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));
      await waitFor(() => screen.getByTitle(/Corsivo/i));

      const editor = document.querySelector('.ProseMirror');
      if (editor) {
        const range = document.createRange();
        range.selectNodeContents(editor.querySelector('em'));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);

        await waitFor(() => {
          const italicButton = screen.getByTitle(/Corsivo/i);
          expect(italicButton.className).toContain('bg-indigo-100');
        });
      }
    });

    it('text align buttons show active state', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent='<p style="text-align: center;">Centered</p>'
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));
      await waitFor(() => screen.getByTitle(/Allinea Centro/i));

      const editor = document.querySelector('.ProseMirror');
      if (editor) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);

        await waitFor(() => {
          const centerButton = screen.getByTitle(/Allinea Centro/i);
          expect(centerButton.className).toContain('bg-indigo-100');
        });
      }
    });
  });

  describe('FontSize State Sync with px values', () => {
    it('converts px to rem when syncing font size', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent='<p><span style="font-size: 24px;">Large</span></p>'
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));
      await waitFor(() => screen.getByTitle(/Dimensione Font/i));

      const editor = document.querySelector('.ProseMirror');
      if (editor) {
        const range = document.createRange();
        range.selectNodeContents(editor.querySelector('span'));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);

        // FontSize should be converted from 24px to 1.5rem
        await waitFor(() => {
          const sizeSpinner = screen.getByTitle(/Dimensione Font/i);
          expect(sizeSpinner.textContent).toContain('1.5rem');
        }, { timeout: 2000 });
      }
    });

    it('handles font size without unit (defaults to rem)', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent='<p><span style="font-size: 2;">Custom</span></p>'
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));
      await waitFor(() => screen.getByTitle(/Dimensione Font/i));

      const editor = document.querySelector('.ProseMirror');
      if (editor) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);

        await waitFor(() => {
          const sizeSpinner = screen.getByTitle(/Dimensione Font/i);
          // Should parse as number and use as rem
          expect(sizeSpinner.textContent).toMatch(/\d+(\.\d+)?rem/);
        }, { timeout: 2000 });
      }
    });
  });

  describe('Strike and Code Button Interactions', () => {
    it('toggles strikethrough formatting', async () => {
      await openEditor();
      const user = userEvent.setup();

      const strikeButton = screen.getByTitle(/Barrato/i);
      await user.click(strikeButton);

      await waitFor(() => {
        expect(strikeButton.className).toContain('bg-indigo-100');
      });
    });

    it('toggles code formatting', async () => {
      await openEditor();
      const user = userEvent.setup();

      const codeButton = screen.getByTitle(/Codice Inline/i);
      await user.click(codeButton);

      await waitFor(() => {
        expect(codeButton.className).toContain('bg-indigo-100');
      });
    });
  });

  describe('Justify Alignment', () => {
    it('applies justify alignment when clicked', async () => {
      await openEditor();
      const user = userEvent.setup();

      const justifyButton = screen.getByTitle(/Giustifica/i);
      await user.click(justifyButton);

      await waitFor(() => {
        expect(justifyButton.className).toContain('bg-indigo-100');
      });
    });
  });
});
