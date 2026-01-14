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
    expect(screen.getByTestId('loader2')).toBeDefined();
  });

  it('renders list of configurable texts after loading', async () => {
    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(api.fetchConfigurableTexts).toHaveBeenCalledTimes(1);
    });

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

    const editButton = screen.getByTestId('edit-envelope.front.content');
    await user.click(editButton);

    const textarea = screen.getByTestId('textarea-envelope.front.content');
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toContain('Benvenuti al nostro matrimonio');

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

    const editButton = screen.getByTestId('edit-envelope.front.content');
    await user.click(editButton);

    const textarea = screen.getByTestId('textarea-envelope.front.content');
    await user.clear(textarea);
    await user.type(textarea, '<p>Testo modificato</p>');

    const saveButton = screen.getByTestId('save-envelope.front.content');
    await user.click(saveButton);

    await waitFor(() => {
      expect(api.updateConfigurableText).toHaveBeenCalledWith(
        'envelope.front.content',
        expect.objectContaining({
          content: '<p>Testo modificato</p>',
        })
      );
    });

    await waitFor(() => {
      expect(api.fetchConfigurableTexts).toHaveBeenCalledTimes(2); 
    });
  });

  it('handles create for non-existing text', async () => {
    const user = userEvent.setup();
    api.fetchConfigurableTexts.mockResolvedValue([]);
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ key: 'card.evento.content', content: 'New content' }),
    });

    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Card Evento/i)).toBeInTheDocument();
    });

    const editButton = screen.getByTestId('edit-card.evento.content');
    await user.click(editButton);

    const textarea = screen.getByTestId('textarea-card.evento.content');
    await user.type(textarea, '<p>New event content</p>');

    const saveButton = screen.getByTestId('save-card.evento.content');
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

    const editButton = screen.getByTestId('edit-envelope.front.content');
    await user.click(editButton);

    const saveButton = screen.getByTestId('save-envelope.front.content');
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

    const searchInput = screen.getByTestId('search-input');
    await user.type(searchInput, 'alloggio');

    expect(screen.queryByText(/Busta: Fronte/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Card Alloggio: Offerto/i)).toBeInTheDocument();
  });

  it('shows emoji picker when emoji button is clicked', async () => {
    const user = userEvent.setup();
    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Busta: Fronte/i)).toBeInTheDocument();
    });

    const editButton = screen.getByTestId('edit-envelope.front.content');
    await user.click(editButton);

    const emojiButton = screen.getByTestId('emoji-btn-envelope.front.content');
    await user.click(emojiButton);

    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
  });

  it('adds emoji to content when selected', async () => {
    const user = userEvent.setup();
    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Busta: Fronte/i)).toBeInTheDocument();
    });

    const editButton = screen.getByTestId('edit-envelope.front.content');
    await user.click(editButton);

    const textarea = screen.getByTestId('textarea-envelope.front.content');
    const originalContent = textarea.value;

    const emojiButton = screen.getByTestId('emoji-btn-envelope.front.content');
    await user.click(emojiButton);

    const mockEmojiButton = screen.getByText('Mock Emoji');
    await user.click(mockEmojiButton);

    expect(textarea.value).toBe(originalContent + '😊');
  });

  it('cancels editing and restores original content', async () => {
    const user = userEvent.setup();
    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Busta: Fronte/i)).toBeInTheDocument();
    });

    const editButton = screen.getByTestId('edit-envelope.front.content');
    await user.click(editButton);

    const textarea = screen.getByTestId('textarea-envelope.front.content');
    await user.clear(textarea);
    await user.type(textarea, 'Modified but will cancel');

    const cancelButton = screen.getByTestId('cancel-envelope.front.content');
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByTestId('textarea-envelope.front.content')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Benvenuti al nostro matrimonio/i)).toBeInTheDocument();
  });
});
