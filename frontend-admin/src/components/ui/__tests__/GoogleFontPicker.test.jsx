import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../../services/api';
import * as FontLoader from '../../../utils/fontLoader';
import GoogleFontPicker from '../GoogleFontPicker';

// --- MOCKS ---

// Mock API
vi.mock('../../../services/api', () => ({
  api: {
    fetchGoogleFonts: vi.fn(),
  }
}));

// Mock Utils
vi.mock('../../../utils/fontLoader', () => ({
  loadGoogleFont: vi.fn(),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Se il test continua a dare errore, usa la sintassi della classe esplicita:
globalThis.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Verifica se PointerEvent esiste, altrimenti crealo (JSDOM spesso non lo ha)
if (!globalThis.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type, props) {
      super(type, props);
      this.pointerId = props.pointerId || 0;
      this.pointerType = props.pointerType || 'mouse';
    }
  }
  globalThis.PointerEvent = PointerEvent;
}

// Necessario per evitare errori con componenti che catturano il puntatore
HTMLElement.prototype.setPointerCapture = vi.fn();
HTMLElement.prototype.releasePointerCapture = vi.fn();

// Mock LocalStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    clear: () => { store = {}; },
    removeItem: (key) => { delete store[key]; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('GoogleFontPicker', () => {
  const mockOnSelect = vi.fn();
  // Ensure "items" structure matches what component expects after API response normalization
  const mockFonts = {
    items: [
      { family: 'Roboto', category: 'sans-serif' },
      { family: 'Open Sans', category: 'sans-serif' },
      { family: 'Lora', category: 'serif' }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('renders placeholder initially', () => {
    render(<GoogleFontPicker onSelect={mockOnSelect} />);
    expect(screen.getByText('Font')).toBeInTheDocument();
  });

  it('renders active family if provided', () => {
    render(<GoogleFontPicker activeFamily="Roboto" onSelect={mockOnSelect} />);
    expect(screen.getByText('Roboto')).toBeInTheDocument();
  });

  it('fetches fonts when opened and caches them', async () => {
    api.fetchGoogleFonts.mockResolvedValue(mockFonts);
    const user = userEvent.setup();

    render(<GoogleFontPicker onSelect={mockOnSelect} />);

    expect(screen.getByRole('button', { name: 'Font' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Font' }));

    expect(api.fetchGoogleFonts).toHaveBeenCalled();

    // Explicitly wait for the virtual list to render the items
    await waitFor(() => {
      expect(screen.getByText('Roboto')).toBeInTheDocument();
      expect(screen.getByText('Lora')).toBeInTheDocument();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'mw:googleFonts:v1:popularity',
      expect.stringContaining('Roboto')
    );
  });

  it('reads from cache if available', async () => {
    const cachedData = {
      ts: Date.now(),
      items: [{ family: 'CachedFont', category: 'display' }]
    };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(cachedData));
    const user = userEvent.setup();

    render(<GoogleFontPicker onSelect={mockOnSelect} />);

    expect(screen.getByRole('button', { name: 'Font' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Font' }));

    expect(api.fetchGoogleFonts).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('CachedFont')).toBeInTheDocument();
    });
  });

  it('filters fonts via search input', async () => {
    api.fetchGoogleFonts.mockResolvedValue(mockFonts);
    const user = userEvent.setup();

    render(<GoogleFontPicker onSelect={mockOnSelect} />);
    expect(screen.getByRole('button', { name: 'Font' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Font' }));

    // Wait for initial list
    await waitFor(() => expect(screen.getByText('Roboto')).toBeInTheDocument());

    const input = screen.getByPlaceholderText('admin.config.text_editor.search_placeholder');
    await user.type(input, 'lora');

    // Wait for virtual list to update
    await waitFor(() => {
      expect(screen.getByText('Lora')).toBeInTheDocument();
      expect(screen.queryByText('Roboto')).not.toBeInTheDocument();
    });
  });

  it('loads font on hover', async () => {
    api.fetchGoogleFonts.mockResolvedValue(mockFonts);
    const user = userEvent.setup();

    render(<GoogleFontPicker onSelect={mockOnSelect} />);
    expect(screen.getByRole('button', { name: 'Font' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Font' }));

    const fontOption = await screen.findByText('Roboto');
    await user.hover(fontOption);

    expect(FontLoader.loadGoogleFont).toHaveBeenCalledWith('"Roboto", sans-serif');
  });

  it('selects font on click', async () => {
    api.fetchGoogleFonts.mockResolvedValue(mockFonts);
    const user = userEvent.setup();

    render(<GoogleFontPicker onSelect={mockOnSelect} />);
    expect(screen.getByRole('button', { name: 'Font' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Font' }));

    const fontOption = await screen.findByText('Open Sans');
    await user.click(fontOption);

    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({ family: 'Open Sans' })
    );
  });

  it('uses fallback fonts on API error', async () => {
    // Silence console error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    api.fetchGoogleFonts.mockRejectedValue(new Error('Network Error'));
    const user = userEvent.setup();

    render(<GoogleFontPicker onSelect={mockOnSelect} />);
    expect(screen.getByRole('button', { name: 'Font' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Font' }));

    await waitFor(() => {
      expect(screen.getByText('admin.configuration.fonts.offline_mode')).toBeInTheDocument();
      // Check for at least one fallback font
      expect(screen.getByText('Inter')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});
