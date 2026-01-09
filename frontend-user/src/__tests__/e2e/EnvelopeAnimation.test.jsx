import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
    
    // Setup default successful auth
    api.authenticateInvitation.mockResolvedValue({
      valid: true,
      invitation: {
        name: 'Famiglia Test',
        code: 'test-code',
        status: 'created',
        guests: [],
        letter_content: "Caro Ospite,\nSiamo lieti di invitarti." // FIX: Added letter_content
      }
    });

    // Simulate URL params
    window.history.pushState({}, 'Test Page', '/?code=test&token=test');
  });

  it('should display closed envelope on load', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Wait for the envelope to appear (async loading)
    await waitFor(() => {
        const envelopes = screen.queryAllByRole('button'); // Envelope is often a button
        expect(envelopes.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('should reveal invitation content after interaction', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Wait for envelope to load (async)
    // Target the specific button with aria-label "Vedi dettagli"
    const openAction = await screen.findByRole('button', { name: /vedi dettagli/i });
    
    if(openAction) {
        await userEvent.click(openAction);
        
        // Wait for animation to reveal content
        // Since LetterContent is now inside EnvelopeAnimation and rendered after opening
        // we check for elements that LetterContent would render
        await waitFor(() => {
            // Check for text from the mock letter content or the mocked InvitationCard
            expect(screen.getByText(/Caro Ospite/i)).toBeInTheDocument();
        }, { timeout: 5000 });
    }
  });
});
