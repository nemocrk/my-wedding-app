import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LetterContent from '../LetterContent';
import * as apiService from '../../../services/api';
import * as analyticsService from '../../../services/analytics';

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
    
    expect(screen.getByText(/Domenico & Loredana/i)).toBeInTheDocument();
    expect(screen.getByText(/Abbiamo deciso di fare il grande passo\.\.\./i)).toBeInTheDocument();
    expect(screen.getByText(/e di farlo a piedi nudi!/i)).toBeInTheDocument();
    expect(screen.getByText(/Ci sposiamo il 19 Settembre 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/sulla spiaggia di Golfo Aranci/i)).toBeInTheDocument();
    expect(screen.getByText(/\(Sì! in Sardegna!!\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Preparatevi a scambiare le scarpe strette con la sabbia tra le dita\. Vi promettiamo:/i)).toBeInTheDocument();
    expect(screen.getByText(/Poca formalità • Molto spritz • Un tramonto indimenticabile/i)).toBeInTheDocument();
    expect(screen.getByText(/Dress Code: Beach Chic/i)).toBeInTheDocument();
    expect(screen.getByText(/\(I tacchi a spillo sono i nemici numero uno della sabbia, siete avvisati!\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Vedi dettagli"})).toBeInTheDocument();
  });

  it('renders back letter content correctly', () => {
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
    expect(screen.getByRole('button', { name: /Conferma/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Declina/i })).toBeInTheDocument();
  });

  it('handles RSVP confirmation submission', async () => {
    apiService.submitRSVP.mockResolvedValue({ success: true, message: 'Grazie!' });
    render(<LetterContent data={mockData} />);

    // Select options
    const accommodationCheckbox = screen.getByLabelText("Richiedo l'alloggio");
    fireEvent.click(accommodationCheckbox);

    // Click confirm
    const confirmButton = screen.getByRole('button', { name: /Conferma/i });
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
    const declineButton = screen.getByRole('button', { name: /Declina/i });
    fireEvent.click(declineButton);

    expect(apiService.submitRSVP).toHaveBeenCalledWith('declined', false, false);
    
    await waitFor(() => {
      expect(screen.getByText(/Ci dispiace/i)).toBeInTheDocument();
      expect(screen.getByText(/Grazie comunque per averci avvisato/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    apiService.submitRSVP.mockRejectedValue(new Error('Network Error'));
    render(<LetterContent data={mockData} />);

    const confirmButton = screen.getByRole('button', { name: /Conferma/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/Network Error/i)).toBeInTheDocument();
    });
  });
});