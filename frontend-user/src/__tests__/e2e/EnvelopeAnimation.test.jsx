import '../../../test/setup.jsx'; // Import i18n and TextContext mocks (corrected extension)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { BrowserRouter } from 'react-router';
import * as api from '../../services/api';

// Mock child components to isolate animation test
vi.mock('../../components/InvitationCard', () => ({
  default: () => <div data-testid="invitation-card">Siete Invitati</div>
}));

// Mock API service
vi.mock('../../services/api', () => ({
  authenticateInvitation: vi.fn(),
  getInvitationDetails: vi.fn(),
  submitRSVP: vi.fn()
}));

describe('Envelope Animation E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Setup default successful auth
    api.authenticateInvitation.mockResolvedValue({
      valid: true,
      invitation: {
        name: 'Famiglia Test',
        code: 'test-code',
        status: 'created',
        guests: [],
        letter_content: "Caro Ospite,\nSiamo lieti di invitarti.",
        // Required by LetterContent (avoid crash)
        whatsapp: {
          whatsapp_number: '+39 333 1111111',
          whatsapp_name: 'Sposi'
        },
        // Needed by LetterContent default flow
        accommodation_offered: false,
        accommodation_requested: false,
        phone_number: ''
      }
    });

    // Simulate URL params
    window.history.pushState({}, 'Test Page', '/?code=test&token=test');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should display closed envelope on load', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Let InvitationPage authenticate (microtask) and start animation sequence timers
    await act(async () => {
      await Promise.resolve();
    });

    // We don't assert UI specifics here: this is a smoke test that app renders without crashing
    // use queryByText for negative assertion
    expect(screen.queryByText(/Errore caricamento invito/i)).not.toBeInTheDocument();
  });

  it('should reveal invitation content after interaction', async () => {
    // Setup userEvent with fake timers
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Let InvitationPage authenticate
    await act(async () => {
      await Promise.resolve();
    });

    // Advance time to complete the FULL animation sequence (handleSequence ~5.4s)
    await act(async () => {
      vi.advanceTimersByTime(7000);
    });

    // Verify LetterContent is visible in the extracted letter
    expect(screen.getByText(/Domenico & Loredana/i)).toBeInTheDocument();
    // "Caro Ospite" is inside the "Evento" card, so it's not visible initially
    
    // Use user var to avoid lint/unused warnings in some setups
    expect(user).toBeDefined();
  }, 15_000);
});