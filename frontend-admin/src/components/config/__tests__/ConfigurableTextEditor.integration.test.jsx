import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fontLoader from '../../../utils/fontLoader';
import ConfigurableTextEditor from '../ConfigurableTextEditor';

// Mock only i18n (necessario per il rendering)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

// Spy on fontLoader (non mock, solo spy)
vi.spyOn(fontLoader, 'autoLoadFontsFromHTML');

describe('ConfigurableTextEditor - Integration Tests', () => {
  const mockOnSave = vi.fn().mockResolvedValue(undefined);
  const initialContent = '<p style="font-family: Roboto;">Test <strong>bold</strong> content</p>';

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = 'unset'; // Reset scroll lock
  });

  describe('Preview Card', () => {
    it('renders preview with initial HTML content', () => {
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent={initialContent}
          onSave={mockOnSave}
          label="Test Label"
        />
      );

      expect(screen.getByText('Test Label')).toBeInTheDocument();
      // dangerouslySetInnerHTML renders the HTML
      expect(screen.getByText('bold')).toBeInTheDocument();
    });

    it('shows empty state when no content provided', () => {
      render(
        <ConfigurableTextEditor
          textKey="empty_key"
          initialContent=""
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText(/Nessun contenuto/i)).toBeInTheDocument();
    });

    it('auto-loads fonts from initial content', () => {
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent={initialContent}
          onSave={mockOnSave}
        />
      );

      expect(fontLoader.autoLoadFontsFromHTML).toHaveBeenCalledWith(initialContent);
    });

    it('opens editor modal on edit button click', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent={initialContent}
          onSave={mockOnSave}
        />
      );

      const editButton = screen.getByText(/admin.config.text_editor.buttons.edit/i);
      await user.click(editButton);

      // Modal should be open - check for save/cancel buttons
      await waitFor(() => {
        expect(screen.getByText(/admin.config.text_editor.buttons.save/i)).toBeInTheDocument();
        expect(screen.getByText(/admin.config.text_editor.buttons.cancel/i)).toBeInTheDocument();
      });
    });

    it('locks body scroll when editor opens', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent={initialContent}
          onSave={mockOnSave}
        />
      );

      expect(document.body.style.overflow).toBe('unset');

      const editButton = screen.getByText(/admin.config.text_editor.buttons.edit/i);
      await user.click(editButton);

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });
    });
  });

  describe('LazyEditor Modal', () => {
    it('renders editor with menu bar when opened', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent={initialContent}
          onSave={mockOnSave}
          label="Custom Label"
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));

      await waitFor(() => {
        // Check for toolbar buttons (Lucide icons are rendered)
        expect(screen.getByTitle(/Grassetto/i)).toBeInTheDocument();
        expect(screen.getByTitle(/Corsivo/i)).toBeInTheDocument();
        expect(screen.getByTitle(/Annulla/i)).toBeInTheDocument();
      });
    });

    it('displays dialog title with label', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent={initialContent}
          onSave={mockOnSave}
          label="My Custom Title"
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));

      await waitFor(() => {
        expect(screen.getAllByText('My Custom Title')[0]).toBeInTheDocument();
      });
    });

    it('closes modal on cancel button', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent={initialContent}
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));

      const cancelButton = await screen.findByTitle(/Annulla/i);
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTitle(/Grassetto/i)).not.toBeInTheDocument();
      });
    });

    it('calls onSave and closes modal on save button', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p>Initial</p>"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));

      const saveButton = await screen.findByText(/admin.config.text_editor.buttons.save/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('test_key', expect.stringContaining('<p>'));
      });

      // Modal should close after save
      await waitFor(() => {
        expect(screen.queryByTitle(/Grassetto/i)).not.toBeInTheDocument();
      });
    });

    it('shows loading state while saving', async () => {
      const slowSave = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      const user = userEvent.setup();

      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p>Test</p>"
          onSave={slowSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));
      const saveButton = await screen.findByText(/admin.config.text_editor.buttons.save/i);

      await user.click(saveButton);

      // Loader should appear
      expect(screen.getByTitle(/admin.config.text_editor.buttons.save/i)).toBeDisabled();
    });

    it('handles save error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
      const failingSave = vi.fn().mockRejectedValue(new Error('Save failed'));
      const user = userEvent.setup();

      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p>Test</p>"
          onSave={failingSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));
      const saveButton = await screen.findByText(/admin.config.text_editor.buttons.save/i);

      await user.click(saveButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to save text:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Editor Content Interaction', () => {
    it('initializes TipTap editor with content', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p>Editable content</p>"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));

      await waitFor(() => {
        // TipTap renders content in ProseMirror div
        const editor = document.querySelector('.ProseMirror');
        expect(editor).toBeTruthy();
        expect(editor.textContent).toContain('Editable content');
      });
    });

    it('editor is focusable and editable', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p>Test</p>"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));

      await waitFor(() => {
        const editor = document.querySelector('.ProseMirror');
        expect(editor).toBeTruthy();
        expect(editor.getAttribute('contenteditable')).toBe('true');
      });
    });
  });

  describe('Toolbar Formatting Actions', () => {
    it('bold button toggles bold formatting', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p>Text</p>"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));

      const boldButton = await screen.findByTitle(/Grassetto/i);
      await user.click(boldButton);

      // Bold button should get active class
      await waitFor(() => {
        expect(boldButton.className).toContain('bg-indigo-100');
      });
    });

    it('italic button toggles italic formatting', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p>Text</p>"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));

      const italicButton = await screen.findByTitle(/Corsivo/i);
      await user.click(italicButton);

      await waitFor(() => {
        expect(italicButton.className).toContain('bg-indigo-100');
      });
    });

    it('underline button toggles underline formatting', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p>Text</p>"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));

      const underlineButton = await screen.findByTitle(/Sottolineato/i);
      await user.click(underlineButton);

      await waitFor(() => {
        expect(underlineButton.className).toContain('bg-indigo-100');
      });
    });

    it('alignment buttons set text alignment', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p>Text</p>"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));

      const centerButton = await screen.findByTitle(/Allinea Centro/i);
      await user.click(centerButton);

      await waitFor(() => {
        expect(centerButton.className).toContain('bg-indigo-100');
      });
    });

    it('undo/redo buttons are initially disabled', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p>Text</p>"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));

      const undoButton = await screen.findByTitle(/Annulla/i);
      const redoButton = await screen.findByTitle(/Ripeti/i);

      expect(undoButton).toBeDisabled();
      expect(redoButton).toBeDisabled();
    });
  });

  describe('Font Controls', () => {
    it('renders GoogleFontPicker in toolbar', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p>Text</p>"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));

      await waitFor(() => {
        // GoogleFontPicker renders a button with "Font" or "Open Sans"
        expect(screen.getByText(/Font|Open Sans/i)).toBeInTheDocument();
      });
    });

    it('renders font size spinner', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p>Text</p>"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));

      await waitFor(() => {
        const sizeSpinner = screen.getByTitle(/Dimensione Font/i);
        expect(sizeSpinner).toBeInTheDocument();
        expect(sizeSpinner.textContent).toContain('rem');
      });
    });

    it('renders rotation spinner', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p>Text</p>"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));

      await waitFor(() => {
        const rotationSpinner = screen.getByTitle(/Rotazione/i);
        expect(rotationSpinner).toBeInTheDocument();
        expect(rotationSpinner.textContent).toContain('°');
      });
    });

    it('renders color picker input', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p>Text</p>"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));

      await waitFor(() => {
        const colorPicker = screen.getByTitle(/Colore Testo/i);
        expect(colorPicker).toBeInTheDocument();
        expect(colorPicker.type).toBe('color');
      });
    });
  });

  describe('Accessibility', () => {
    it('modal has proper ARIA attributes', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="test_key"
          initialContent="<p>Test</p>"
          onSave={mockOnSave}
          label="Accessible Label"
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby');
      });
    });

    it('dialog title is properly linked via aria-labelledby', async () => {
      const user = userEvent.setup();
      render(
        <ConfigurableTextEditor
          textKey="unique_key"
          initialContent="<p>Test</p>"
          onSave={mockOnSave}
          label="Unique Label"
        />
      );

      await user.click(screen.getByText(/admin.config.text_editor.buttons.edit/i));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const titleId = dialog.getAttribute('aria-labelledby');
        expect(titleId).toBe('editor-title-unique_key');

        const titleElement = document.getElementById(titleId);
        expect(titleElement.textContent).toBe('Unique Label');
      });
    });
  });
});
