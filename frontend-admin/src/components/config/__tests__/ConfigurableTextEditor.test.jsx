import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConfigurableTextEditor from '../ConfigurableTextEditor';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Loader2: () => <span data-testid="loader-icon" />,
  Save: () => <span data-testid="save-icon" />,
  Undo: () => <span data-testid="undo-icon" />,
  Bold: () => <span data-testid="bold-icon" />,
  Italic: () => <span data-testid="italic-icon" />,
  Underline: () => <span data-testid="underline-icon" />,
  List: () => <span data-testid="list-icon" />,
  ListOrdered: () => <span data-testid="list-ordered-icon" />,
  Link: () => <span data-testid="link-icon" />,
  Unlink: () => <span data-testid="unlink-icon" />,
  RotateCcw: () => <span data-testid="rotate-ccw-icon" />,
  RotateCw: () => <span data-testid="rotate-cw-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  X: () => <span data-testid="x-icon" />,
  Check: () => <span data-testid="check-icon" />,
}));

// Mock TipTap since it relies on browser APIs not fully present in JSDOM
// We mock the hook and the component
vi.mock('@tiptap/react', () => {
  return {
    useEditor: ({ content }) => ({
      getHTML: () => content || '<p>Mock Content</p>',
      commands: {
        setContent: vi.fn(),
      },
      chain: () => ({
        focus: () => ({
          toggleBold: () => ({ run: vi.fn() }),
          toggleItalic: () => ({ run: vi.fn() }),
          toggleUnderline: () => ({ run: vi.fn() }),
          toggleBulletList: () => ({ run: vi.fn() }),
          toggleOrderedList: () => ({ run: vi.fn() }),
          unsetLink: () => ({ run: vi.fn() }),
          undo: () => ({ run: vi.fn() }),
          redo: () => ({ run: vi.fn() }),
          extendMarkRange: () => ({
            setLink: () => ({ run: vi.fn() }),
            unsetLink: () => ({ run: vi.fn() }),
          }),
        }),
      }),
      can: () => ({
        chain: () => ({
          focus: () => ({
            toggleBold: () => ({ run: () => true }),
            toggleItalic: () => ({ run: () => true }),
            undo: () => ({ run: () => true }),
            redo: () => ({ run: () => true }),
          }),
        }),
      }),
      isActive: () => false,
      setEditable: vi.fn(),
    }),
    EditorContent: () => <div data-testid="mock-editor-content" />,
  };
});

// Mock extensions
vi.mock('@tiptap/starter-kit', () => ({ default: {} }));
vi.mock('@tiptap/extension-link', () => ({ default: { configure: () => ({}) } }));
vi.mock('@tiptap/extension-underline', () => ({ default: {} }));

describe('ConfigurableTextEditor', () => {
  const mockOnSave = vi.fn();

  it('renders correctly in view mode', () => {
    render(
      <ConfigurableTextEditor 
        textKey="test.key" 
        initialContent="<p>Initial Content</p>" 
        onSave={mockOnSave} 
      />
    );

    expect(screen.getByText('test.key')).toBeInTheDocument();
    expect(screen.getByTestId('edit-test.key')).toBeInTheDocument();
    // In view mode, editor is rendered but opacity might differ.
    // Our mock renders EditorContent always, but in real component logic applies styles.
    expect(screen.getByTestId('tiptap-content-test.key')).toBeInTheDocument();
  });

  it('switches to edit mode on click', async () => {
    render(
      <ConfigurableTextEditor 
        textKey="test.key" 
        initialContent="<p>Initial Content</p>" 
        onSave={mockOnSave} 
      />
    );

    const editButton = screen.getByTestId('edit-test.key');
    fireEvent.click(editButton);

    expect(screen.getByTestId('save-test.key')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-test.key')).toBeInTheDocument();
    
    // Toolbar icons should be visible
    expect(screen.getByTestId('bold-icon')).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', async () => {
    render(
      <ConfigurableTextEditor 
        textKey="test.key" 
        initialContent="<p>Initial Content</p>" 
        onSave={mockOnSave} 
      />
    );

    fireEvent.click(screen.getByTestId('edit-test.key'));
    fireEvent.click(screen.getByTestId('save-test.key'));

    expect(mockOnSave).toHaveBeenCalledWith('test.key', '<p>Initial Content</p>');
  });

  it('cancels editing', async () => {
    render(
      <ConfigurableTextEditor 
        textKey="test.key" 
        initialContent="<p>Initial Content</p>" 
        onSave={mockOnSave} 
      />
    );

    fireEvent.click(screen.getByTestId('edit-test.key'));
    expect(screen.queryByTestId('edit-test.key')).not.toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('cancel-test.key'));
    
    expect(screen.getByTestId('edit-test.key')).toBeInTheDocument();
  });
});
