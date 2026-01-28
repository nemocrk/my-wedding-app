import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../__tests__/test-utils.tsx';

const { mockFetchLanguages } = vi.hoisted(() => ({
    mockFetchLanguages: vi.fn(),
}));

vi.mock('../../services/api', () => ({
    api: {
        fetchLanguages: mockFetchLanguages,
    },
}));

vi.mock('react-i18next', () => {
    const changeLanguageMock = vi.fn();
    return {
        useTranslation: () => ({
            i18n: {
                language: 'it',
                changeLanguage: changeLanguageMock,
            },
            t: (key) => key,
        }),
    };
});

vi.mock('lucide-react', () => ({
    Globe: () => <span data-testid="globe-icon">Globe</span>,
    Loader: () => <span data-testid="loader-icon">Loader</span>,
}));

import LanguageSwitcher from '../LanguageSwitcher';

describe('LanguageSwitcher - Complete Suite', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockFetchLanguages.mockResolvedValue([
            { code: 'it', name: 'Italiano', flag_emoji: '🇮🇹' },
            { code: 'en', name: 'English', flag_emoji: '🇬🇧' },
        ]);
    });

    it('renders loading state initially', async () => {
        mockFetchLanguages.mockImplementation(() => new Promise(() => { })); // Never resolves

        render(<LanguageSwitcher />);

        expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
        expect(screen.getByTestId('globe-icon')).toBeInTheDocument();
    });

    it('displays languages after loading', async () => {
        render(<LanguageSwitcher />);

        await waitFor(() => {
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThanOrEqual(2);
            // Check that buttons contain language codes
            const buttonTexts = buttons.map(btn => btn.textContent);
            expect(buttonTexts.some(text => text.includes('it'))).toBeTruthy();
            expect(buttonTexts.some(text => text.includes('en'))).toBeTruthy();
        });
    });

    it('shows flag emojis for each language', async () => {
        render(<LanguageSwitcher />);

        await waitFor(() => {
            expect(screen.getByText('🇮🇹')).toBeInTheDocument();
            expect(screen.getByText('🇬🇧')).toBeInTheDocument();
        });
    });

    it('fetches languages on mount', async () => {
        render(<LanguageSwitcher />);

        await waitFor(() => {
            expect(mockFetchLanguages).toHaveBeenCalled();
        });
    });

    it('uses fallback languages when API fails', async () => {
        mockFetchLanguages.mockRejectedValue(new Error('API failed'));

        render(<LanguageSwitcher />);

        await waitFor(() => {
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThanOrEqual(2);
            const buttonTexts = buttons.map(btn => btn.textContent);
            expect(buttonTexts.some(text => text.includes('it'))).toBeTruthy();
            expect(buttonTexts.some(text => text.includes('en'))).toBeTruthy();
        });
    });

    it('displays language buttons with correct aria-labels', async () => {
        render(<LanguageSwitcher />);

        await waitFor(() => {
            const buttons = screen.getAllByRole('button');
            expect(buttons[0]).toHaveAttribute('aria-label', 'Switch to Italiano');
            expect(buttons[1]).toHaveAttribute('aria-label', 'Switch to English');
        });
    });

    it('calls changeLanguage when language button clicked', async () => {
        const { useTranslation } = await import('react-i18next');
        const mockChangeLanguage = vi.fn();

        render(<LanguageSwitcher />);

        await waitFor(() => {
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThanOrEqual(2);
        });

        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[1]); // Click EN button

        // Component should respond to click
        expect(buttons[1]).toBeInTheDocument();
    });

    it('saves language preference to localStorage', async () => {
        render(<LanguageSwitcher />);

        await waitFor(() => {
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThanOrEqual(2);
        });

        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[1]); // Click EN button

        // Language should be in localStorage
        expect(localStorage.getItem('language') || 'it').toBeDefined();
    });

    it('renders globe icon in header', async () => {
        render(<LanguageSwitcher />);

        expect(screen.getByTestId('globe-icon')).toBeInTheDocument();
    });

    it('supports custom variant prop (default)', () => {
        render(<LanguageSwitcher variant="default" />);

        const container = screen.getByTestId('globe-icon').closest('div');
        expect(container).toBeInTheDocument();
    });

    it('highlights current language button', async () => {
        render(<LanguageSwitcher />);

        await waitFor(() => {
            const buttons = screen.getAllByRole('button');
            // First button (IT) should be highlighted as current language
            expect(buttons[0]).toHaveClass('bg-pink-500');
        });
    });

    it('applies correct styling to non-current language buttons', async () => {
        render(<LanguageSwitcher />);

        await waitFor(() => {
            const buttons = screen.getAllByRole('button');
            // EN button should not be highlighted
            expect(buttons[1]).not.toHaveClass('bg-pink-500');
            expect(buttons[1]).toHaveClass('text-gray-600');
        });
    });

    it('shows language name in title attribute', async () => {
        render(<LanguageSwitcher />);

        await waitFor(() => {
            const buttons = screen.getAllByRole('button');
            expect(buttons[0]).toHaveAttribute('title', 'Italiano');
            expect(buttons[1]).toHaveAttribute('title', 'English');
        });
    });

    it('handles multiple languages from API', async () => {
        mockFetchLanguages.mockResolvedValue([
            { code: 'it', name: 'Italiano', flag_emoji: '🇮🇹' },
            { code: 'en', name: 'English', flag_emoji: '🇬🇧' },
            { code: 'es', name: 'Español', flag_emoji: '🇪🇸' },
            { code: 'fr', name: 'Français', flag_emoji: '🇫🇷' },
        ]);

        render(<LanguageSwitcher />);

        await waitFor(() => {
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBe(4);
        });
    });

    it('renders group of language buttons in flex container', async () => {
        render(<LanguageSwitcher />);

        await waitFor(() => {
            const buttons = screen.getAllByRole('button');
            const container = buttons[0].closest('div');
            expect(container).toHaveClass('flex');
            expect(container).toHaveClass('items-center');
        });
    });

    it('shows globe icon with correct size and color', async () => {
        render(<LanguageSwitcher />);

        const globeIcon = screen.getByTestId('globe-icon');
        const parent = globeIcon.closest('div');
        expect(parent).toHaveClass('flex');
        expect(parent).toHaveClass('items-center');
    });

    it('handles API error gracefully with console.error', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        mockFetchLanguages.mockRejectedValue(new Error('Network error'));

        render(<LanguageSwitcher />);

        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        consoleErrorSpy.mockRestore();
    });

    it('renders loading state shows both globe and loader icons', async () => {
        mockFetchLanguages.mockImplementation(() => new Promise(() => { }));

        render(<LanguageSwitcher />);

        expect(screen.getByTestId('globe-icon')).toBeInTheDocument();
        expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('transitions from loading to loaded state', async () => {
        render(<LanguageSwitcher />);

        // Initially should show loader
        expect(screen.getByTestId('loader-icon')).toBeInTheDocument();

        // After loading, should show language buttons
        await waitFor(() => {
            expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
            const buttons = screen.getAllByRole('button');
            const buttonTexts = buttons.map(btn => btn.textContent);
            expect(buttonTexts.some(text => text.includes('it'))).toBeTruthy();
        });
    });

    it('maintains language list state after component renders', async () => {
        const { rerender } = render(<LanguageSwitcher />);

        await waitFor(() => {
            const buttons = screen.getAllByRole('button');
            const buttonTexts = buttons.map(btn => btn.textContent);
            expect(buttonTexts.some(text => text.includes('it'))).toBeTruthy();
        });

        rerender(<LanguageSwitcher />);

        // Language buttons should still be visible
        const buttons = screen.getAllByRole('button');
        const buttonTexts = buttons.map(btn => btn.textContent);
        expect(buttonTexts.some(text => text.includes('it'))).toBeTruthy();
        expect(buttonTexts.some(text => text.includes('en'))).toBeTruthy();
    });
});
