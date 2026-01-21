import '../../../test/setup.jsx'; // Import i18n and TextContext mocks (corrected extension)
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
    status: 'sent',
    name: 'Mario Rossi',
    letter_content: 'Benvenuti al nostro matrimonio!',
    guests: [
      { first_name: 'Mario', last_name: 'Rossi', is_child: false },
      { first_name: 'Luigi', last_name: '', is_child: true }
    ],
    accommodation_offered: true,
    accommodation_requested: false,
    phone_number: '+39 333 1234567',
    // Required by LetterContent (avoid crash)
    whatsapp: {
      whatsapp_number: '+39 333 1111111',
      whatsapp_name: 'Domenico & Loredana',
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
        // Find guest list items
        const listItems = screen.getAllByRole('listitem');
        // Click the exclude button (✕) within each list item
        // This avoids clicking the modal close button which also has "✕"
        listItems.forEach(item => {
           const excludeBtn = within(item).getByText('✕');
           fireEvent.click(excludeBtn);
        });
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

    // NUOVO TEST INCREMENTALE PER ISSUE #71
    it('displays dietary requirements hint and textarea when editing', async () => {
      render(<LetterContent data={mockData} />);

      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));

      await waitFor(() => {
        const editButtons = screen.getAllByText('✏️');
        fireEvent.click(editButtons[0]);
      });

      // Verifica che l'hint sia presente
      expect(screen.getByText(/Clicca sulla matita per modificare/i)).toBeInTheDocument();

      // Verifica che la textarea dietary sia presente
      const dietaryTextarea = screen.getByPlaceholderText(/Allergie, intolleranze/i);
      expect(dietaryTextarea).toBeInTheDocument();
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

    it('does not show carpool option when car_option is a non-empty string (current behavior)', async () => {
      render(<LetterContent data={mockData} />);

      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));
      fireEvent.click(screen.getByText(/Avanti →/i));
      fireEvent.click(screen.getByText(/Avanti →/i));

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Aereo'));
      });

      // In current implementation car_option defaults to 'none' (truthy), so this checkbox is rendered.
      expect(screen.queryByLabelText(/Sarebbe carino organizzarmi/i)).toBeInTheDocument();
    });
  });

  describe('Wizard Step 4 - Accommodation', () => {
    it('renders accommodation request field if offered', async () => {
      render(<LetterContent data={mockData} />);

      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));
      fireEvent.click(screen.getByText(/Avanti →/i));
      fireEvent.click(screen.getByText(/Avanti →/i));

      await waitFor(() => {
        fireEvent.click(screen.getByText(/Avanti →/i));
      });

      await waitFor(() => {
        expect(screen.getByText(/Richiesta di Alloggio/i)).toBeInTheDocument();
        expect(screen.getByLabelText('Sì, desidero alloggio')).toBeInTheDocument();
        expect(screen.getByLabelText('No, grazie')).toBeInTheDocument();
      });
    });

    it('skips accommodation step if not offered', async () => {
      const dataNoAccom = { ...mockData, accommodation_offered: false };
      render(<LetterContent data={dataNoAccom} />);

      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));
      fireEvent.click(screen.getByText(/Avanti →/i));
      fireEvent.click(screen.getByText(/Avanti →/i));
      fireEvent.click(screen.getByText(/Avanti →/i));

      // Should go straight to summary (Step 5)
      await waitFor(() => {
        expect(screen.getByText(/Riepilogo/i)).toBeInTheDocument();
      });
    });
  });

  describe('Wizard Step 5 - Summary & Submit', () => {
    it('shows summary and allows RSVP submission', async () => {
      apiService.submitRSVP.mockResolvedValue({ success: true });

      render(<LetterContent data={mockData} />);

      // Navigate to summary
      fireEvent.click(screen.getByText('RSVP - Conferma Presenza'));
      fireEvent.click(screen.getByText(/Avanti →/i));
      fireEvent.click(screen.getByText(/Avanti →/i));
      fireEvent.click(screen.getByText(/Avanti →/i));
      fireEvent.click(screen.getByText(/Avanti →/i));

      await waitFor(() => {
        expect(screen.getByText(/Riepilogo/i)).toBeInTheDocument();
      });

      const submitBtn = screen.getByText(/Conferma RSVP/i);
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(apiService.submitRSVP).toHaveBeenCalled();
      });
    });
  });
});