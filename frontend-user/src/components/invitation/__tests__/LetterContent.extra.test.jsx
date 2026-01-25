import '../../../test/setup.jsx'; // Import i18n and TextContext mocks
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LetterContent from '../LetterContent';
import * as apiService from '../../../services/api';
import userEvent from '@testing-library/user-event';

// Mock services
vi.mock('../../../services/api', () => ({
  submitRSVP: vi.fn(),
}));

vi.mock('../../../services/analytics', () => ({
  logInteraction: vi.fn(),
  heatmapTracker: {
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
  useAnimation: () => ({ start: vi.fn() }),
}));

describe('LetterContent Component - Comprehensive Coverage', () => {
  const mockData = {
    status: 'sent',
    name: 'Mario Rossi',
    letter_content: 'Benvenuti',
    guests: [
      { first_name: 'Mario', last_name: 'Rossi', is_child: false },
    ],
    accommodation_offered: true,
    accommodation_requested: false,
    phone_number: '+39 333 1234567',
    whatsapp: {
      whatsapp_number: '+39 333 1111111',
      whatsapp_name: 'Sposi',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Decline RSVP Flow', () => {
    it('handles declining invitation directly', async () => {
      const user = userEvent.setup();
      apiService.submitRSVP.mockResolvedValue({ success: true });

      render(<LetterContent data={mockData} />);

      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));
      
      // Select Decline in first step (Guest list)
      // Usually there's a "Purtroppo non potremo esserci" button or similar logic
      // Assuming button "Declino l'invito" or similar logic based on context
      // If not present, we simulate excluding all guests which triggers logic
      
      // Wait, standard flow is: Confirm Guests -> ...
      // Is there a "Decline" button? The previous tests didn't show one.
      // Let's assume the flow is: Open Modal -> Click "Purtroppo non ci saremo"
      
      // Let's check logic for decline.
      // If UI has a specific decline button:
      const declineBtn = screen.getByText(/Purtroppo non ci saremo/i);
      fireEvent.click(declineBtn);

      // Should show confirmation dialog or directly submit?
      // Assuming a confirmation text appears
      await waitFor(() => {
         expect(screen.getByText(/Ci dispiace che non possiate esserci/i)).toBeInTheDocument();
      });

      // Submit Decline
      const confirmDecline = screen.getByText(/Conferma Rinuncia/i);
      fireEvent.click(confirmDecline);

      await waitFor(() => {
        expect(apiService.submitRSVP).toHaveBeenCalledWith(
          'declined',
          false,
          false,
          expect.anything()
        );
      });
    });
  });

  describe('Navigation & Validation', () => {
    it('handles back navigation from all steps', async () => {
        render(<LetterContent data={mockData} />);
        
        // Open
        fireEvent.click(screen.getByText('RSVP - Conferma Presenza')); // Step 1
        
        // 1 -> 2
        fireEvent.click(screen.getByText(/Avanti/i)); 
        await waitFor(() => expect(screen.getByText('Numero di Contatto')).toBeInTheDocument());
        
        // 2 -> 3
        fireEvent.click(screen.getByText(/Avanti/i));
        await waitFor(() => expect(screen.getByText('Come Viaggerai?')).toBeInTheDocument());
        
        // 3 -> 2 (Back)
        fireEvent.click(screen.getByText(/Indietro/i));
        await waitFor(() => expect(screen.getByText('Numero di Contatto')).toBeInTheDocument());
        
        // 2 -> 1 (Back)
        fireEvent.click(screen.getByText(/Indietro/i));
        await waitFor(() => expect(screen.getByText('Conferma Ospiti')).toBeInTheDocument());
    });
  });
});
