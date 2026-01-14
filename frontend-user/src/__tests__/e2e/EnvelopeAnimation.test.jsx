import '../../test/setup.jsx'; // Import i18n and TextContext mocks
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
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
    // Nota: Rimosso vi.useFakeTimers() globale perché blocca waitFor() nel primo test
    // Lo attiviamo solo dove serve specificamente

    // Setup default successful auth
    api.authenticateInvitation.mockResolvedValue({
      valid: true,
      invitation: {
        name: 'Famiglia Test',
        code: 'test-code',
        status: 'created',
        guests: [],
        letter_content: "Caro Ospite,\nSiamo lieti di invitarti.",
        whatsapp: {
          whatsapp_number: '+39 333 1111111',
          whatsapp_name: 'Sposi'
        },
        accommodation_offered: false,
        accommodation_requested: false,
        phone_number: ''
      }
    });

    // Simulate URL params robustly
    const url = new URL('http://localhost/?code=test&token=test');
    window.history.replaceState({}, 'Test Page', url.toString());
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

    // Wait for authentication to complete (loading state)
    // Senza fake timers, waitFor usa i timer reali e funziona correttamente
    await waitFor(() => {
      expect(api.authenticateInvitation).toHaveBeenCalledWith('test', 'test');
    });

    // We verify the app rendered successfully by checking the envelope is present
    const envelopeContainer = document.querySelector('.envelope-container-3d');
    expect(envelopeContainer).toBeInTheDocument();
  });

  it('should reveal invitation content after interaction', async () => {
    // Enable fake timers ONLY for this test to control long animations
    vi.useFakeTimers();

    // Setup userEvent with fake timers
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Poiché ora usiamo fake timers, dobbiamo far avanzare il tempo affinché waitFor funzioni
    // O semplicemente aspettare la chiamata API (che è un microtask promise, non timer)
    // Ma waitFor stesso usa timer per il polling.
    // Usiamo un approccio misto: avanziamo i timer mentre aspettiamo
    
    // Auth call should happen immediately (promise)
    await act(async () => {
        // Run pending promises
        await Promise.resolve(); 
    });
    
    // Verifichiamo che l'auth sia partita
    expect(api.authenticateInvitation).toHaveBeenCalled();

    // Advance time to complete any initial loading animation or state updates
    await act(async () => {
      vi.runAllTimers();
    });

    // Verify envelope is ready
    const envelopeContainer = document.querySelector('.envelope-container-3d');
    expect(envelopeContainer).toBeInTheDocument();

    // Interaction would be simulating a click on the envelope (if implemented in E2E)
    // But here we rely on the component's auto-sequence or user interaction logic.
    // Assuming the test logic originally intended to simulate the sequence duration:
    
    // Advance time to complete the FULL animation sequence (handleSequence ~5.4s)
    await act(async () => {
      vi.advanceTimersByTime(7000);
    });

    // Verify LetterContent is visible in the extracted letter
    // Se l'animazione ha completato, il contenuto dovrebbe essere renderizzato
    expect(screen.getByText(/Domenico & Loredana/i)).toBeInTheDocument();
  }, 15_000);
});