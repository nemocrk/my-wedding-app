import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// CRITICAL: Mock API BEFORE importing component (hoisting)
vi.mock('../../../services/api', () => ({
  api: {
    fetchLanguages: vi.fn(),
    fetchConfigurableTexts: vi.fn(),
    updateConfigurableText: vi.fn(),
    deleteConfigurableText: vi.fn(),
    getConfigurableText: vi.fn(),
    createConfigurableText: vi.fn(),
  },
}));

import TextConfigWidget from '../TextConfigWidget';
import { api } from '../../../services/api';

// NOTA: TipTap, GoogleFontPicker e fontLoader sono mockati globalmente in setupTests.tsx

describe('TextConfigWidget', () => {
  const mockLanguages = [
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

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
    
    // Setup default mock implementations
    api.fetchLanguages.mockResolvedValue(mockLanguages);
    api.fetchConfigurableTexts.mockResolvedValue(mockTexts);
    api.updateConfigurableText.mockResolvedValue({ success: true });
    api.deleteConfigurableText.mockResolvedValue({ success: true });
  });

  it('renders loading state initially', () => {
    render(<TextConfigWidget />);
    
    // Loader2 icon has 'animate-spin' class
    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
  });

  it('renders list of configurable texts after loading', async () => {
    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(api.fetchLanguages).toHaveBeenCalledTimes(1);
      expect(api.fetchConfigurableTexts).toHaveBeenCalled();
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

    // Find "Modifica" button for this specific text (multiple buttons exist)
    const editButtons = screen.getAllByRole('button', { name: /modifica/i });
    await user.click(editButtons[0]);

    // Modal should open - use dialog role to scope queries
    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByRole('button', { name: /annulla/i })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: /salva/i })).toBeInTheDocument();
    });
  });

  it('saves updated text content', async () => {
    const user = userEvent.setup();
    api.updateConfigurableText.mockResolvedValue({ success: true });

    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Busta: Fronte/i)).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /modifica/i });
    await user.click(editButtons[0]);

    // Wait for modal to open and find Save button within dialog
    let saveButton;
    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      saveButton = within(dialog).getByRole('button', { name: /salva/i });
      expect(saveButton).toBeInTheDocument();
    });

    await user.click(saveButton);

    await waitFor(() => {
      expect(api.updateConfigurableText).toHaveBeenCalledWith(
        'envelope.front.content',
        expect.objectContaining({
          content: expect.any(String),
        }),
        'it' // selectedLang default
      );
    });
  });

  it('handles create for non-existing text', async () => {
    const user = userEvent.setup();
    api.fetchConfigurableTexts.mockResolvedValue([]);
    api.updateConfigurableText.mockResolvedValue({ success: true });

    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Card Evento/i)).toBeInTheDocument();
    });

    // Find all "Modifica" buttons and click the one for Card Evento
    const editButtons = screen.getAllByRole('button', { name: /modifica/i });
    // Card Evento is one of the KNOWN_KEYS, should be present
    const cardEventoButton = editButtons.find(btn => 
      btn.closest('[class*="border-l-amber"]') !== null
    );
    
    if (cardEventoButton) {
      await user.click(cardEventoButton);

      let saveButton;
      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        saveButton = within(dialog).getByRole('button', { name: /salva/i });
        expect(saveButton).toBeInTheDocument();
      });

      await user.click(saveButton);

      await waitFor(() => {
        expect(api.updateConfigurableText).toHaveBeenCalled();
      });
    }
  });

  it('displays error message on fetch failure', async () => {
    api.fetchLanguages.mockRejectedValue(new Error('Network error'));
    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Impossibile caricare le configurazioni/i)).toBeInTheDocument();
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

    const editButtons = screen.getAllByRole('button', { name: /modifica/i });
    await user.click(editButtons[0]);

    let saveButton;
    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      saveButton = within(dialog).getByRole('button', { name: /salva/i });
      expect(saveButton).toBeInTheDocument();
    });

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

    // Use placeholder text to find search input
    const searchInput = screen.getByPlaceholderText(/cerca testo/i);
    await user.type(searchInput, 'alloggio');

    await waitFor(() => {
      expect(screen.queryByText(/Busta: Fronte/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Card Alloggio: Offerto/i)).toBeInTheDocument();
    });
  });

  it('cancels editing and restores original content', async () => {
    const user = userEvent.setup();
    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Busta: Fronte/i)).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /modifica/i });
    await user.click(editButtons[0]);

    // Wait for modal and find Cancel button within dialog scope
    let cancelButton;
    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      cancelButton = within(dialog).getByRole('button', { name: /annulla/i });
      expect(cancelButton).toBeInTheDocument();
    });

    await user.click(cancelButton);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Content should still be visible
    expect(screen.getByText(/Benvenuti al nostro matrimonio/i)).toBeInTheDocument();
  });

  it('switches between language tabs', async () => {
    const user = userEvent.setup();
    api.fetchConfigurableTexts
      .mockResolvedValueOnce(mockTexts) // IT
      .mockResolvedValueOnce([]) // EN (empty)
      .mockResolvedValueOnce(mockTexts) // IT reload
      .mockResolvedValueOnce([]); // EN reload

    render(<TextConfigWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Busta: Fronte/i)).toBeInTheDocument();
    });

    // Find and click EN button (uppercase text "EN")
    const enButton = screen.getByRole('button', { name: /en/i });
    await user.click(enButton);

    await waitFor(() => {
      // When switching to EN, should show "missing" indicators
      const missingBadges = screen.getAllByText(/⚠️ Manca in EN/i);
      expect(missingBadges.length).toBeGreaterThan(0);
    });
  });
});
