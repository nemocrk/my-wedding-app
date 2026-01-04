import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LetterContent from '../LetterContent';
import * as apiService from '../../services/api';
import * as analyticsService from '../../services/analytics';

// Mock services
vi.mock('../../services/api', () => ({
  submitRSVP: vi.fn(),
}));

vi.mock('../../services/analytics', () => ({
  logInteraction: vi.fn(),
  heatmapTracker: {
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

describe('LetterContent Component', () => {
  const mockData = {
    status: 'pending',
    letter_content: 'Benvenuti al nostro matrimonio!',
    guests: [
      { first_name: 'Mario', last_name: 'Rossi', is_child: false },
      { first_name: 'Luigi', is_child: true }
    ],
    accommodation_offered: true,
    transfer_offered: true,
    accommodation_requested: false,
    transfer_requested: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders letter content correctly', () => {
    render(<LetterContent data={mockData} />);
    
    expect(screen.getByText(/Siete Invitati!/i)).toBeInTheDocument();
    expect(screen.getByText('Benvenuti al nostro matrimonio!')).toBeInTheDocument();
    expect(screen.getByText('Mario Rossi')).toBeInTheDocument();
    expect(screen.getByText(/Bambino/i)).toBeInTheDocument();
  });

  it('renders RSVP form options when status is pending', () => {
    render(<LetterContent data={mockData} />);
    
    expect(screen.getByText("Richiedo l'alloggio")).toBeInTheDocument();
    expect(screen.getByText("Richiedo il transfer")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Conferma Partecipazione/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Non Potrò Partecipare/i })).toBeInTheDocument();
  });

  it('handles RSVP confirmation submission', async () => {
    apiService.submitRSVP.mockResolvedValue({ success: true, message: 'Grazie!' });
    render(<LetterContent data={mockData} />);

    // Select options
    const accommodationCheckbox = screen.getByLabelText("Richiedo l'alloggio");
    fireEvent.click(accommodationCheckbox);

    // Click confirm
    const confirmButton = screen.getByRole('button', { name: /Conferma Partecipazione/i });
    fireEvent.click(confirmButton);

    expect(apiService.submitRSVP).toHaveBeenCalledWith('confirmed', true, false);
    
    await waitFor(() => {
      expect(screen.getByText(/Partecipazione Confermata!/i)).toBeInTheDocument();
    });
  });

  it('handles RSVP decline submission', async () => {
    apiService.submitRSVP.mockResolvedValue({ success: true, message: 'Peccato!' });
    render(<LetterContent data={mockData} />);

    // Click decline
    const declineButton = screen.getByRole('button', { name: /Non Potrò Partecipare/i });
    fireEvent.click(declineButton);

    expect(apiService.submitRSVP).toHaveBeenCalledWith('declined', false, false);
    
    await waitFor(() => {
      expect(screen.getByText(/Ci dispiace che non possiate partecipare/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    apiService.submitRSVP.mockRejectedValue(new Error('Network Error'));
    render(<LetterContent data={mockData} />);

    const confirmButton = screen.getByRole('button', { name: /Conferma Partecipazione/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/Network Error/i)).toBeInTheDocument();
    });
  });

  it('matches snapshot', () => {
    const { container } = render(<LetterContent data={mockData} />);
    expect(container).toMatchSnapshot();
  });
});
