import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LetterContent from '../LetterContent';
import * as apiService from '../../../services/api';
import * as analyticsService from '../../../services/analytics';
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

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
  useAnimation: () => ({ start: vi.fn() }),
}));

describe('LetterContent Component - Wizard RSVP Multi-Step', () => {
  const mockData = {
    status: 'pending',
    name: 'Mario Rossi',
    letter_content: 'Benvenuti al nostro matrimonio!',
    guests: [
      { first_name: 'Mario', last_name: 'Rossi', is_child: false },
      { first_name: 'Luigi', last_name: '', is_child: true }
    ],
    accommodation_offered: true,
    accommodation_requested: false,
    phone_number: '+39 333 1234567',
    config: {
      whatsapp_groom_number: '+39 333 1111111',
      whatsapp_bride_number: '+39 333 2222222',
      whatsapp_groom_firstname: 'Domenico',
      whatsapp_bride_firstname: 'Loredana',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Front Face - Rendering', () => {
    it('renders front face with wedding details', () => {
      render(<LetterContent data={mockData} />);
      
      expect(screen.getByText(/Domenico & Loredana/i)).toBeInTheDocument();
      expect(screen.getByText(/Ci sposiamo il 19 Settembre 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/Dress Code: Beach Chic/i)).toBeInTheDocument();
    });
  });

  describe('RSVP Card Click - Opens Modal', () => {
    it('opens RSVP modal when RSVP card is clicked', async () => {
      render(<LetterContent data={mockData} />);
      
      const rsvpCard = screen.getByText('RSVP - Conferma Presenza');
      fireEvent.click(rsvpCard);

      await waitFor(() => {
        expect(screen.getByText('Conferma Ospiti')).toBeInTheDocument();
      });
    });
  });

  describe('Wizard Step 1 - Guests', () => {
    it('renders guests list with edit and exclude buttons', async () => {
      render(<LetterContent data={mockData} />);
      
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));

      await waitFor(() => {
        expect(screen.getByText('Mario Rossi')).toBeInTheDocument();
        expect(screen.getByText('Luigi')).toBeInTheDocument();
        expect(screen.getByText('Bambino')).toBeInTheDocument();
      });
    });

    it('prevents advancing if all guests excluded', async () => {
      render(<LetterContent data={mockData} />);
      
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));

      await waitFor(() => {
        const excludeButtons = screen.getAllByText('✕');
        excludeButtons.forEach(btn => fireEvent.click(btn));
      });

      const nextBtn = screen.getByText(/Avanti/i);
      fireEvent.click(nextBtn);

      await waitFor(() => {
        expect(screen.getByText(/Devi confermare almeno un ospite/i)).toBeInTheDocument();
      });
    });

    it('allows guest name editing', async () => {
      const user = userEvent.setup();
      render(<LetterContent data={mockData} />);
      
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));

      await waitFor(() => {
        const editButtons = screen.getAllByText('✏️');
        fireEvent.click(editButtons[0]);
      });

      const nameInput = screen.getAllByPlaceholderText('Nome')[0];
      await user.clear(nameInput);
      await user.type(nameInput, 'Giuseppe');

      const saveBtn = screen.getAllByText('✓')[0];
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText('Giuseppe Rossi')).toBeInTheDocument();
      });
    });
  });

  describe('Wizard Step 2 - Contact', () => {
    it('navigates to contact step and shows phone field', async () => {
      render(<LetterContent data={mockData} />);
      
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));

      await waitFor(() => {
        const nextBtn = screen.getByText(/Avanti →/i);
        fireEvent.click(nextBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Numero di Contatto')).toBeInTheDocument();
        expect(screen.getByText('+39 333 1234567')).toBeInTheDocument();
      });
    });

    it('validates phone number format', async () => {
      const user = userEvent.setup();
      render(<LetterContent data={{ ...mockData, phone_number: '' }} />);
      
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));

      await waitFor(() => {
        fireEvent.click(screen.getByText(/Avanti →/i));
      });

      await waitFor(() => {
        const editBtn = screen.getByText('✏️');
        fireEvent.click(editBtn);
      });

      const phoneInput = screen.getByPlaceholderText('+39 333 1234567');
      await user.type(phoneInput, 'invalid');

      const saveBtn = screen.getByText('✓');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Formato non valido/i)).toBeInTheDocument();
      });
    });

    it('allows back navigation to step 1', async () => {
      render(<LetterContent data={mockData} />);
      
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));
      fireEvent.click(screen.getByText(/Avanti →/i));

      await waitFor(() => {
        expect(screen.getByText('Numero di Contatto')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/← Indietro/i));

      await waitFor(() => {
        expect(screen.getByText('Conferma Ospiti')).toBeInTheDocument();
      });
    });
  });

  describe('Wizard Step 3 - Travel', () => {
    it('renders travel form with transport options', async () => {
      render(<LetterContent data={mockData} />);
      
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));
      fireEvent.click(screen.getByText(/Avanti →/i));
      
      await waitFor(() => {
        fireEvent.click(screen.getByText(/Avanti →/i));
      });

      await waitFor(() => {
        expect(screen.getByText('Come Viaggerai?')).toBeInTheDocument();
        expect(screen.getByLabelText('Traghetto')).toBeInTheDocument();
        expect(screen.getByLabelText('Aereo')).toBeInTheDocument();
      });
    });

    it('shows conditional car checkbox for traghetto', async () => {
      render(<LetterContent data={mockData} />);
      
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));
      fireEvent.click(screen.getByText(/Avanti →/i));
      fireEvent.click(screen.getByText(/Avanti →/i));

      await waitFor(() => {
        const traghettoRadio = screen.getByLabelText('Traghetto');
        fireEvent.click(traghettoRadio);
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Auto al seguito')).toBeInTheDocument();
      });
    });

    it('shows carpool option if no car selected', async () => {
      render(<LetterContent data={mockData} />);
      
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));
      fireEvent.click(screen.getByText(/Avanti →/i));
      fireEvent.click(screen.getByText(/Avanti →/i));

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Aereo'));
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/Sarebbe carino organizzarmi/i)).toBeInTheDocument();
      });
    });

    it('validates travel fields before advancing', async () => {
      render(<LetterContent data={mockData} />);
      
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));
      fireEvent.click(screen.getByText(/Avanti →/i));
      fireEvent.click(screen.getByText(/Avanti →/i));

      await waitFor(() => {
        const nextBtn = screen.getByText(/Avanti →/i);
        fireEvent.click(nextBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Compila tutti i campi del viaggio/i)).toBeInTheDocument();
      });
    });
  });

  describe('Wizard Step 4 - Accommodation', () => {
    it('shows accommodation step if offered', async () => {
      const user = userEvent.setup();
      render(<LetterContent data={mockData} />);
      
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));
      fireEvent.click(screen.getByText(/Avanti →/i));
      fireEvent.click(screen.getByText(/Avanti →/i));

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Aereo'));
      });

      const scheduleInput = screen.getByPlaceholderText(/Partenza/i);
      await user.type(scheduleInput, 'Partenza 10:00');

      fireEvent.click(screen.getByText(/Avanti →/i));

      await waitFor(() => {
        expect(screen.getByText('Alloggio')).toBeInTheDocument();
        expect(screen.getByLabelText(/Sì, richiedo l'alloggio/i)).toBeInTheDocument();
      });
    });

    it('skips accommodation step if not offered', async () => {
      const user = userEvent.setup();
      const dataNoAccommodation = { ...mockData, accommodation_offered: false };
      render(<LetterContent data={dataNoAccommodation} />);
      
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));
      fireEvent.click(screen.getByText(/Avanti →/i));
      fireEvent.click(screen.getByText(/Avanti →/i));

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Aereo'));
      });

      const scheduleInput = screen.getByPlaceholderText(/Partenza/i);
      await user.type(scheduleInput, 'Partenza 10:00');

      fireEvent.click(screen.getByText(/Avanti →/i));

      await waitFor(() => {
        expect(screen.getByText('Conferma Finale')).toBeInTheDocument();
      });
    });
  });

  describe('Wizard Step 5 - Final Confirmation', () => {
    it('shows final summary with all data', async () => {
      const user = userEvent.setup();
      render(<LetterContent data={mockData} />);
      
      // Navigate through all steps
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));
      fireEvent.click(screen.getByText(/Avanti →/i)); // guests
      fireEvent.click(screen.getByText(/Avanti →/i)); // contact

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Traghetto'));
      });

      const scheduleInput = screen.getByPlaceholderText(/Partenza/i);
      await user.type(scheduleInput, 'Partenza 10:00');

      fireEvent.click(screen.getByLabelText('Auto al seguito'));
      fireEvent.click(screen.getByText(/Avanti →/i)); // travel
      fireEvent.click(screen.getByText(/Avanti →/i)); // accommodation

      await waitFor(() => {
        expect(screen.getByText('Conferma Finale')).toBeInTheDocument();
        expect(screen.getByText(/Trasporto:/i)).toBeInTheDocument();
        expect(screen.getByText(/traghetto/i)).toBeInTheDocument();
      });
    });

    it('submits RSVP with complete payload', async () => {
      const user = userEvent.setup();
      apiService.submitRSVP.mockResolvedValue({ success: true, message: 'Grazie!' });
      
      render(<LetterContent data={mockData} />);
      
      // Navigate to final step
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));
      fireEvent.click(screen.getByText(/Avanti →/i));
      fireEvent.click(screen.getByText(/Avanti →/i));

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Aereo'));
      });

      const scheduleInput = screen.getByPlaceholderText(/Partenza/i);
      await user.type(scheduleInput, 'Partenza 14:00');

      fireEvent.click(screen.getByText(/Avanti →/i));
      
      await waitFor(() => {
        fireEvent.click(screen.getByLabelText(/Sì, richiedo l'alloggio/i));
      });

      fireEvent.click(screen.getByText(/Avanti →/i));

      await waitFor(() => {
        const confirmBtn = screen.getByText(/✔️ Conferma Presenza/i);
        fireEvent.click(confirmBtn);
      });

      await waitFor(() => {
        expect(apiService.submitRSVP).toHaveBeenCalledWith(
          'confirmed',
          true,
          false,
          expect.objectContaining({
            phone_number: '+39 333 1234567',
            travel_info: expect.objectContaining({
              transport_type: 'aereo',
              schedule: 'Partenza 14:00',
            }),
          })
        );
      });
    });
  });

  describe('Already Confirmed - Summary Page', () => {
    it('shows summary page with modify button if already confirmed', async () => {
      const confirmedData = { ...mockData, status: 'confirmed' };
      render(<LetterContent data={confirmedData} />);
      
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));

      await waitFor(() => {
        expect(screen.getByText('Il tuo RSVP')).toBeInTheDocument();
        expect(screen.getByText(/Hai già confermato/i)).toBeInTheDocument();
        expect(screen.getByText('Modifica Risposta')).toBeInTheDocument();
      });
    });

    it('allows modification from summary page', async () => {
      const confirmedData = { ...mockData, status: 'confirmed' };
      render(<LetterContent data={confirmedData} />);
      
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));

      await waitFor(() => {
        const modifyBtn = screen.getByText('Modifica Risposta');
        fireEvent.click(modifyBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Conferma Ospiti')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const user = userEvent.setup();
      apiService.submitRSVP.mockRejectedValue(new Error('Network Error'));
      
      render(<LetterContent data={mockData} />);
      
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));
      fireEvent.click(screen.getByText(/Avanti →/i));
      fireEvent.click(screen.getByText(/Avanti →/i));

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Aereo'));
      });

      const scheduleInput = screen.getByPlaceholderText(/Partenza/i);
      await user.type(scheduleInput, 'Test');

      fireEvent.click(screen.getByText(/Avanti →/i));
      fireEvent.click(screen.getByText(/Avanti →/i));

      await waitFor(() => {
        const confirmBtn = screen.getByText(/✔️ Conferma Presenza/i);
        fireEvent.click(confirmBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Network Error/i)).toBeInTheDocument();
      });
    });
  });
});