import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import GoogleFontPicker from '../GoogleFontPicker';
import { api } from '../../../services/api';
import * as FontLoader from '../../../utils/fontLoader';

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

// Mock React Window (Virtual List)
// We need to render the children properly so testing-library can see them
vi.mock('react-window', () => ({
  List: ({ children, rowCount, itemData }) => (
    <div data-testid="virtual-list">
      {Array.from({ length: rowCount }).map((_, index) => {
          // Provide minimal styles to avoid crash if component relies on style
          return children({ index, style: {}, data: itemData });
      })}
    </div>
  ),
}));

// Mock Radix UI Popover to avoid Portal issues and state complexity in tests
vi.mock('@radix-ui/react-popover', () => ({
  Root: ({ children, open, onOpenChange }) => {
    return (
        <div data-testid="popover-root">
             {/* We simply render children. State is managed by the component, 
                 but we won't see the content unless 'open' is true. 
                 However, since we mock Trigger/Content, we can control visibility manually or rely on parent.
                 Actually, simpler approach for tests: Always render Content if open is true.
             */}
             {children} 
        </div>
    );
  },
  Trigger: ({ children, onClick }) => (
    <div onClick={onClick} data-testid="popover-trigger">
      {children}
    </div>
  ),
  Portal: ({ children }) => <div data-testid="popover-portal">{children}</div>,
  // CRITICAL: Only render content if parent says it's open? 
  // The component logic is: <Popover.Root open={open} ...>
  // So the content inside Portal is only rendered by Radix when open.
  // In our mock, we need to respect that or just render always if we want to test content.
  // But wait, the component controls 'open' state internally via useState.
  // We can't easily access that internal state from outside in the mock.
  // So we will just Render the content always in the mock, BUT the component code puts it in Portal.
  Content: ({ children }) => <div data-testid="popover-content">{children}</div>,
  Arrow: () => null,
}));

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
    
    // Open Popover
    await user.click(screen.getByTestId('popover-trigger'));

    expect(api.fetchGoogleFonts).toHaveBeenCalled();
    
    // Wait for list to populate
    await waitFor(() => {
        expect(screen.getByText('Roboto')).toBeInTheDocument();
    });
    expect(screen.getByText('Lora')).toBeInTheDocument();

    // Check cache write
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
    localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));
    const user = userEvent.setup();

    render(<GoogleFontPicker onSelect={mockOnSelect} />);
    
    await user.click(screen.getByTestId('popover-trigger'));

    // Should NOT call API
    expect(api.fetchGoogleFonts).not.toHaveBeenCalled();
    expect(await screen.findByText('CachedFont')).toBeInTheDocument();
  });

  it('filters fonts via search input', async () => {
    api.fetchGoogleFonts.mockResolvedValue(mockFonts);
    const user = userEvent.setup();

    render(<GoogleFontPicker onSelect={mockOnSelect} />);
    await user.click(screen.getByTestId('popover-trigger'));
    
    // Wait for initial load
    await waitFor(() => expect(screen.getByText('Roboto')).toBeInTheDocument());

    const input = screen.getByPlaceholderText('admin.config.text_editor.search_placeholder');
    await user.type(input, 'lora');

    expect(await screen.findByText('Lora')).toBeInTheDocument();
    // Roboto should be filtered out
    expect(screen.queryByText('Roboto')).not.toBeInTheDocument();
  });

  it('loads font on hover', async () => {
    api.fetchGoogleFonts.mockResolvedValue(mockFonts);
    const user = userEvent.setup();

    render(<GoogleFontPicker onSelect={mockOnSelect} />);
    await user.click(screen.getByTestId('popover-trigger'));
    
    const fontOption = await screen.findByText('Roboto');
    await user.hover(fontOption);

    expect(FontLoader.loadGoogleFont).toHaveBeenCalledWith('"Roboto", sans-serif');
  });

  it('selects font on click', async () => {
    api.fetchGoogleFonts.mockResolvedValue(mockFonts);
    const user = userEvent.setup();

    render(<GoogleFontPicker onSelect={mockOnSelect} />);
    await user.click(screen.getByTestId('popover-trigger'));
    
    const fontOption = await screen.findByText('Open Sans');
    await user.click(fontOption);

    expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({ family: 'Open Sans' })
    );
  });

  it('uses fallback fonts on API error', async () => {
    api.fetchGoogleFonts.mockRejectedValue(new Error('Network Error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();

    render(<GoogleFontPicker onSelect={mockOnSelect} />);
    await user.click(screen.getByTestId('popover-trigger'));

    // Should show error message
    await waitFor(() => {
        expect(screen.getByText('admin.configuration.fonts.offline_mode')).toBeInTheDocument();
    });

    // Should show Fallback fonts (e.g., Inter, Merriweather from FALLBACK_FONTS)
    expect(screen.getByText('Inter')).toBeInTheDocument();
    expect(screen.getByText('Merriweather')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });
});
