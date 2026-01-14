import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextConfigWidget from '../TextConfigWidget';
import { api } from '../../../services/api';

// Mock API service
vi.mock('../../../services/api', () => ({
  api: {
    fetchConfigurableTexts: vi.fn(),
    updateConfigurableText: vi.fn(),
  },
}));

// Mock EmojiPicker to avoid issues in test environment
vi.mock('emoji-picker-react', () => ({
  default: ({ onEmojiClick }) => (
    <div data-testid="emoji-picker">
      <button onClick={() => onEmojiClick({ emoji: '😊' })}>Mock Emoji</button>
    </div>
  ),
}));

describe('TextConfigWidget', () => {
  const mockTexts = [
    {
      key: 'envelope.front.content',
      content: '<p>Benvenuti al nostro matrimonio</p>',
      metadata: {},
    },
    {
      key: 'card.alloggio.content_offered',
      content: '<p>Alloggio offerto</p>',
      metadata: {},
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchConfigurableTexts.mockResolvedValue(mockTexts);
  });

  it('renders loading state initially', () => {
    render(<TextConfigWidget />);
    // Should show loader during initial fetch
    expect(screen.getByTestId('loader2') || screen.getByText(/caricamento/i)).toBeDefined();
  });

  it('renders list of configurable texts after loading', async () => {
    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(api.fetchConfigurableTexts).toHaveBeenCalledTimes(1);
    });

    // Should display known keys (predefined) and fetched texts
    expect(screen.getByText(/Busta: Fronte/i)).toBeInTheDocument();
    expect(screen.getByText(/Card Alloggio: Offerto/i)).toBeInTheDocument();
  });

  it('displays fetched content in preview mode', async () => {
    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Benvenuti al nostro matrimonio/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Alloggio offerto/i)).toBeInTheDocument();
  });

  it('allows editing text content', async () => {
    const user = userEvent.setup();
    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Busta: Fronte/i)).toBeInTheDocument();
    });

    // Click "Modifica" button
    const editButton = screen.getAllByText(/Modifica/i)[0];
    await user.click(editButton);

    // Should show textarea in edit mode
    const textarea = screen.getAllByRole('textbox')[0];
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toContain('Benvenuti al nostro matrimonio');

    // Edit content
    await user.clear(textarea);
    await user.type(textarea, '<p>Nuovo contenuto</p>');

    expect(textarea.value).toBe('<p>Nuovo contenuto</p>');
  });

  it('saves updated text content', async () => {
    const user = userEvent.setup();
    api.updateConfigurableText.mockResolvedValue({ success: true });

    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Busta: Fronte/i)).toBeInTheDocument();
    });

    // Enter edit mode
    const editButton = screen.getAllByText(/Modifica/i)[0];
    await user.click(editButton);

    // Modify content
    const textarea = screen.getAllByRole('textbox')[0];
    await user.clear(textarea);
    await user.type(textarea, '<p>Testo modificato</p>');

    // Save
    const saveButton = screen.getAllByTitle(/Salva/i)[0];
    await user.click(saveButton);

    await waitFor(() => {
      expect(api.updateConfigurableText).toHaveBeenCalledWith(
        'envelope.front.content',
        expect.objectContaining({
          content: '<p>Testo modificato</p>',
        })
      );
    });

    // Should refetch data after save
    await waitFor(() => {
      expect(api.fetchConfigurableTexts).toHaveBeenCalledTimes(2); // Initial + after save
    });
  });

  it('handles create for non-existing text', async () => {
    const user = userEvent.setup();
    // Mock fetch returning empty for a new key
    api.fetchConfigurableTexts.mockResolvedValue([]);
    
    // Mock global fetch for POST request
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ key: 'card.evento.content', content: 'New content' }),
    });

    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Card Evento/i)).toBeInTheDocument();
    });

    // Enter edit mode for a key that doesn't exist in DB
    const editButton = screen.getAllByText(/Modifica/i)[2]; // Card Evento
    await user.click(editButton);

    const textarea = screen.getAllByRole('textbox')[2];
    await user.type(textarea, '<p>New event content</p>');

    const saveButton = screen.getAllByTitle(/Salva/i)[2];
    await user.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/texts/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            key: 'card.evento.content',
            content: '<p>New event content</p>',
          }),
        })
      );
    });
  });

  it('displays error message on fetch failure', async () => {
    api.fetchConfigurableTexts.mockRejectedValue(new Error('Network error'));

    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Errore nel caricamento dei testi/i)).toBeInTheDocument();
    });
  });

  it('displays error alert on save failure', async () => {
    const user = userEvent.setup();
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    api.updateConfigurableText.mockRejectedValue(new Error('Save failed'));

    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Busta: Fronte/i)).toBeInTheDocument();
    });

    const editButton = screen.getAllByText(/Modifica/i)[0];
    await user.click(editButton);

    const saveButton = screen.getAllByTitle(/Salva/i)[0];
    await user.click(saveButton);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Errore durante il salvataggio'));
    });

    alertMock.mockRestore();
  });

  it('filters texts based on search input', async () => {
    const user = userEvent.setup();
    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Busta: Fronte/i)).toBeInTheDocument();
    });

    // Initially all items visible
    expect(screen.getByText(/Busta: Fronte/i)).toBeInTheDocument();
    expect(screen.getByText(/Card Alloggio: Offerto/i)).toBeInTheDocument();

    // Type in search box
    const searchInput = screen.getByPlaceholderText(/Cerca testo/i);
    await user.type(searchInput, 'alloggio');

    // Only alloggio items should be visible
    expect(screen.queryByText(/Busta: Fronte/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Card Alloggio: Offerto/i)).toBeInTheDocument();
  });

  it('shows emoji picker when emoji button is clicked', async () => {
    const user = userEvent.setup();
    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Busta: Fronte/i)).toBeInTheDocument();
    });

    // Enter edit mode
    const editButton = screen.getAllByText(/Modifica/i)[0];
    await user.click(editButton);

    // Click emoji button
    const emojiButton = screen.getAllByText(/😊 Emoji/i)[0];
    await user.click(emojiButton);

    // Emoji picker should appear
    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
  });

  it('adds emoji to content when selected', async () => {
    const user = userEvent.setup();
    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Busta: Fronte/i)).toBeInTheDocument();
    });

    const editButton = screen.getAllByText(/Modifica/i)[0];
    await user.click(editButton);

    const textarea = screen.getAllByRole('textbox')[0];
    const originalContent = textarea.value;

    // Open emoji picker
    const emojiButton = screen.getAllByText(/😊 Emoji/i)[0];
    await user.click(emojiButton);

    // Click mock emoji
    const mockEmojiButton = screen.getByText('Mock Emoji');
    await user.click(mockEmojiButton);

    // Emoji should be added to content
    expect(textarea.value).toBe(originalContent + '😊');
  });

  it('cancels editing and restores original content', async () => {
    const user = userEvent.setup();
    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Busta: Fronte/i)).toBeInTheDocument();
    });

    const editButton = screen.getAllByText(/Modifica/i)[0];
    await user.click(editButton);

    const textarea = screen.getAllByRole('textbox')[0];
    const originalContent = textarea.value;

    // Modify content
    await user.clear(textarea);
    await user.type(textarea, 'Modified but will cancel');

    // Click cancel (Undo button)
    const cancelButton = screen.getAllByTitle(/Annulla/i)[0];
    await user.click(cancelButton);

    // Should exit edit mode and restore original
    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    // Original content should be visible in preview
    expect(screen.getByText(/Benvenuti al nostro matrimonio/i)).toBeInTheDocument();
  });
});
