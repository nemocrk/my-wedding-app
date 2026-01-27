import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import ConfigurableTextEditor from '../ConfigurableTextEditor';
import * as TipTapReact from '@tiptap/react';

// --- MOCK TIPTAP LOCALLY TO CAPTURE COMMANDS ---
const mockChain = {
  focus: vi.fn().mockReturnThis(),
  undo: vi.fn().mockReturnThis(),
  redo: vi.fn().mockReturnThis(),
  setFontFamily: vi.fn().mockReturnThis(),
  setFontSize: vi.fn().mockReturnThis(),
  setColor: vi.fn().mockReturnThis(),
  setRotation: vi.fn().mockReturnThis(),
  toggleBold: vi.fn().mockReturnThis(),
  toggleItalic: vi.fn().mockReturnThis(),
  toggleStrike: vi.fn().mockReturnThis(),
  toggleCode: vi.fn().mockReturnThis(),
  toggleUnderline: vi.fn().mockReturnThis(),
  setTextAlign: vi.fn().mockReturnThis(),
  run: vi.fn(),
  setMark: vi.fn().mockReturnThis(),
  unsetMark: vi.fn().mockReturnThis(),
  removeEmptyTextStyle: vi.fn().mockReturnThis(),
};

const mockEditor = {
  getHTML: vi.fn(() => '<p>Mocked Content</p>'),
  commands: {
    setContent: vi.fn(),
    focus: vi.fn(),
    insertContent: vi.fn(),
  },
  chain: vi.fn(() => mockChain),
  can: vi.fn(() => ({
    chain: () => ({
      focus: () => ({
        undo: () => ({ run: () => true }),
        redo: () => ({ run: () => true }),
      }),
    }),
  })),
  on: vi.fn(),
  off: vi.fn(),
  isActive: vi.fn(() => false),
  getAttributes: vi.fn(() => ({})),
  isEditable: true,
};

// Override the global mock for useEditor
vi.mock('@tiptap/react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useEditor: vi.fn(() => mockEditor),
    EditorContent: ({ editor }) => <div data-testid="editor-content" />,
  };
});

// Mock GoogleFontPicker with correct path resolution
// Test file is in src/components/config/__tests__/
// Component imports from ../ui/GoogleFontPicker (src/components/ui/GoogleFontPicker)
// So mock path must be ../../ui/GoogleFontPicker
vi.mock('../../ui/GoogleFontPicker', () => ({
  default: ({ onSelect }) => (
    <button onClick={() => onSelect({ family: 'Roboto', category: 'sans-serif' })}>
      <span>Select Font</span>
    </button>
  ),
}));

describe('ConfigurableTextEditor', () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly in preview mode', () => {
    render(
      <ConfigurableTextEditor 
        textKey="test.key" 
        initialContent="<p>Initial Content</p>" 
        onSave={mockOnSave}
        label="Test Label"
      />
    );
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /modifica/i })).toBeInTheDocument();
  });

  it('opens modal and renders toolbar', async () => {
    const user = userEvent.setup();
    render(
      <ConfigurableTextEditor 
        textKey="test.key" 
        initialContent="<p>Initial Content</p>" 
        onSave={mockOnSave}
        label="Test Label"
      />
    );

    await user.click(screen.getByRole('button', { name: /modifica/i }));
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Verify toolbar buttons are present
    expect(screen.getByTitle('Grassetto')).toBeInTheDocument();
    expect(screen.getByTitle('Corsivo')).toBeInTheDocument();
    expect(screen.getByTitle('Allinea Centro')).toBeInTheDocument();
  });

  it('executes formatting commands when toolbar buttons are clicked', async () => {
    const user = userEvent.setup();
    render(
      <ConfigurableTextEditor textKey="test" initialContent="" onSave={mockOnSave} />
    );

    await user.click(screen.getByRole('button', { name: /modifica/i }));

    // Bold
    await user.click(screen.getByTitle('Grassetto'));
    expect(mockChain.toggleBold).toHaveBeenCalled();
    expect(mockChain.run).toHaveBeenCalled();

    // Italic
    await user.click(screen.getByTitle('Corsivo'));
    expect(mockChain.toggleItalic).toHaveBeenCalled();

    // Align Center
    await user.click(screen.getByTitle('Allinea Centro'));
    expect(mockChain.setTextAlign).toHaveBeenCalledWith('center');
  });

  it('handles font selection', async () => {
    const user = userEvent.setup();
    render(
      <ConfigurableTextEditor textKey="test" initialContent="" onSave={mockOnSave} />
    );
    await user.click(screen.getByRole('button', { name: /modifica/i }));

    await user.click(screen.getByText('Select Font'));
    expect(mockChain.setFontFamily).toHaveBeenCalledWith('"Roboto", sans-serif');
  });

  it('handles NumberSpinner changes (Font Size)', async () => {
    const user = userEvent.setup();
    render(
      <ConfigurableTextEditor textKey="test" initialContent="" onSave={mockOnSave} />
    );
    await user.click(screen.getByRole('button', { name: /modifica/i }));

    // Find font size spinner by title
    const spinner = screen.getByTitle('Dimensione Font (rem)');
    const plusBtn = within(spinner).getByText('+');
    
    await user.click(plusBtn);
    // Initial is 1, step is 0.1 -> 1.1
    expect(mockChain.setFontSize).toHaveBeenCalledWith('1.1rem');
  });

  it('handles NumberSpinner changes (Rotation)', async () => {
    const user = userEvent.setup();
    render(
      <ConfigurableTextEditor textKey="test" initialContent="" onSave={mockOnSave} />
    );
    await user.click(screen.getByRole('button', { name: /modifica/i }));

    const spinner = screen.getByTitle('Rotazione (gradi)');
    const plusBtn = within(spinner).getByText('+');
    
    await user.click(plusBtn);
    // Initial 0, step 1 -> 1
    expect(mockChain.setRotation).toHaveBeenCalledWith(1);
  });

  it('handles NumberSpinner wheel events', async () => {
    render(
      <ConfigurableTextEditor textKey="test" initialContent="" onSave={mockOnSave} />
    );
    fireEvent.click(screen.getByRole('button', { name: /modifica/i }));

    const spinner = screen.getByTitle('Rotazione (gradi)');
    
    // Simulate wheel event
    fireEvent.wheel(spinner, { deltaY: -100 }); // Scroll UP -> increment
    expect(mockChain.setRotation).toHaveBeenCalledWith(1); // 0 + 1

    fireEvent.wheel(spinner, { deltaY: 100 }); // Scroll DOWN -> decrement
    // Note: in valid test environment without real browser behavior, this tests the handler logic
    // but React's synthetic event might need careful mocking. 
    // If the component uses native addEventListener, we need to verify if JSDOM supports it fully.
    // The component does use ref.current.addEventListener.
  });

  it('saves content and closes modal', async () => {
    const user = userEvent.setup();
    mockOnSave.mockResolvedValueOnce();

    render(
      <ConfigurableTextEditor textKey="test" initialContent="" onSave={mockOnSave} />
    );
    await user.click(screen.getByRole('button', { name: /modifica/i }));

    await user.click(screen.getByTitle('Salva modifiche'));
    
    expect(mockEditor.getHTML).toHaveBeenCalled();
    expect(mockOnSave).toHaveBeenCalledWith('test', '<p>Mocked Content</p>');
    
    await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('handles save error gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockOnSave.mockRejectedValueOnce(new Error('Save failed'));

    render(
      <ConfigurableTextEditor textKey="test" initialContent="" onSave={mockOnSave} />
    );
    await user.click(screen.getByRole('button', { name: /modifica/i }));
    await user.click(screen.getByTitle('Salva modifiche'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save text:', expect.any(Error));
    });
    // Modal should stay open on error or at least handle it (implementation just logs currently)
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('manages body overflow on open/close', async () => {
     const user = userEvent.setup();
     render(<ConfigurableTextEditor textKey="test" initialContent="" onSave={mockOnSave} />);
     
     // Open
     await user.click(screen.getByRole('button', { name: /modifica/i }));
     expect(document.body.style.overflow).toBe('hidden');

     // Close
     await user.click(screen.getByTitle('Annulla modifiche'));
     expect(document.body.style.overflow).toBe('unset');
  });
});
