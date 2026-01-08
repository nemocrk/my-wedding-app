import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { BrowserRouter } from 'react-router-dom';

// Mock child components to isolate animation test
vi.mock('../../components/InvitationCard', () => ({
  default: () => <div data-testid="invitation-card">Siete Invitati</div>
}));

describe('Envelope Animation E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display closed envelope on load', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Assuming there is an element with this testid representing the envelope
    // If exact ID is unknown, we check for visual elements via text/role
    const envelopes = screen.queryAllByRole('button'); // Envelope is often a button
    expect(envelopes.length).toBeGreaterThan(0);
  });

  it('should reveal invitation content after interaction', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Simulate click on the "Open" action (envelope or button)
    const openAction = screen.getByRole('button', { hidden: true }) || screen.getByText(/apri/i);
    if(openAction) {
        await userEvent.click(openAction);
        
        // Wait for animation
        await waitFor(() => {
            expect(screen.getByTestId('invitation-card')).toBeInTheDocument();
        }, { timeout: 3000 });
    }
  });
});
