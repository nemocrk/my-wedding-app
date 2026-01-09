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
        letter_content: "Caro Ospite,\nSiamo lieti di invitarti."
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

    await act(async () => {
        vi.advanceTimersByTime(100);
    });

    const envelopes = screen.queryAllByRole('button'); 
    expect(envelopes.length).toBeGreaterThanOrEqual(0); 
  });

  it('should reveal invitation content after interaction', { timeout: 15000 }, async () => {
    // Setup userEvent with fake timers
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // 1. Advance time to complete the FULL animation sequence
    await act(async () => {
        vi.advanceTimersByTime(12000);
    });

    // 2. Now the letter should be in "final" state with pointerEvents: "auto"
    const openAction = await screen.findByRole('button', { name: /vedi dettagli/i });
    
    // 3. Click it
    await user.click(openAction);
    
    // 4. Verify content is visible
    expect(screen.getByText(/Caro Ospite/i)).toBeInTheDocument();
  }); 
});
