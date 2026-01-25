import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../__tests__/setup.jsx'; // Import i18n and TextContext mocks (corrected extension)
import { logInteraction } from '../../../services/analytics';
import { submitRSVP } from '../../../services/api';
import LetterContent from '../LetterContent';

vi.mock('../../../services/api', () => ({
  submitRSVP: vi.fn()
}));

vi.mock('../../../services/analytics', () => ({
  logInteraction: vi.fn(),
  heatmapTracker: { start: vi.fn(), stop: vi.fn() }
}));

// Mock di immagini (ESM compatible format for Vitest)
vi.mock('../assets/illustrations/arch.png', () => ({ default: 'arch.png' }));
vi.mock('../assets/illustrations/chest.png', () => ({ default: 'chest.png' }));
vi.mock('../assets/illustrations/dress.png', () => ({ default: 'dress.png' }));
vi.mock('../assets/illustrations/home.png', () => ({ default: 'home.png' }));
vi.mock('../assets/illustrations/LetterBackground.png', () => ({ default: 'LetterBackground.png' }));
vi.mock('../assets/illustrations/questions.png', () => ({ default: 'questions.png' }));
vi.mock('../assets/illustrations/van.png', () => ({ default: 'van.png' }));
vi.mock('../assets/illustrations/wax.png', () => ({ default: 'wax.png' }));

describe('LetterContent - Dietary Requirements', () => {
  const mockData = {
    status: 'read',
    accommodation_requested: false,
    transfer_requested: false,
    phone_number: '',
    guests: [
      { first_name: 'Mario', last_name: 'Rossi', is_child: false, dietary_requirements: '' },
      { first_name: 'Luigi', last_name: 'Verdi', is_child: false, dietary_requirements: 'Gluten Free' }
    ],
    whatsapp: { whatsapp_number: '1234567890', whatsapp_name: 'Sposi' },
    travel_info: { transport_type: '', schedule: '', car_option: 'none', carpool_interest: false }
  };

  beforeEach(() => {
    logInteraction.mockClear();
  });

  const openRSVP = () => {
    // Cerchiamo l'heading specifico della card RSVP per evitare ambiguità
    const rsvpTitle = screen.getByRole('heading', { name: /RSVP - Conferma Presenza/i });
    fireEvent.click(rsvpTitle);
  };

  it('dovrebbe mostrare il badge intolleranze se presente', async () => {
    render(<LetterContent data={mockData} />);

    openRSVP();

    // Verifica che Luigi abbia il badge
    await waitFor(() => {
      expect(screen.getByText(/Gluten Free/i)).toBeInTheDocument();
    });
  });

  it('dovrebbe permettere di modificare le intolleranze di un ospite', async () => {
    render(<LetterContent data={mockData} />);

    openRSVP();

    // Clicca edit su Mario (primo ospite, indice 0)
    const editButtons = screen.getAllByText('✏️');
    fireEvent.click(editButtons[0]);

    // Trova la textarea delle intolleranze
    const dietaryInput = screen.getByPlaceholderText(/Intollerante al lattosio/i);
    fireEvent.change(dietaryInput, { target: { value: 'Lattosio' } });

    // Salva
    fireEvent.click(screen.getByText('✓'));

    // Verifica che il badge sia apparso
    await waitFor(() => {
      expect(screen.getByText(/Lattosio/i)).toBeInTheDocument();
    });
  });

  it('dovrebbe includere dietary_requirements nel payload di submit', async () => {
    render(<LetterContent data={mockData} />);

    openRSVP();

    // Step 1: Modifica intolleranza Mario
    const editButtons = screen.getAllByText('✏️');
    fireEvent.click(editButtons[0]);
    const dietaryInput = screen.getByPlaceholderText(/Intollerante al lattosio/i);
    fireEvent.change(dietaryInput, { target: { value: 'No Noci' } });
    fireEvent.click(screen.getByText('✓'));

    // Avanza negli step (Guests -> Contact -> Travel -> Final)
    fireEvent.click(screen.getByText(/Avanti/i)); // Guests -> Contact

    // Contact Step
    const phoneEditButtons = screen.getAllByText('✏️');
    fireEvent.click(phoneEditButtons[0]);
    const phoneField = screen.getByPlaceholderText('+39 333 1234567');
    fireEvent.change(phoneField, { target: { value: '+393331234567' } });
    const phoneSaveButton = screen.getByText('✓');
    fireEvent.click(phoneSaveButton);
    fireEvent.click(screen.getByText(/Avanti/i)); // Contact -> Travel

    // Travel Step: Usa getByRole per radio button
    const ferryOption = screen.getByRole('radio', { name: /Traghetto/i });
    fireEvent.click(ferryOption);
    const scheduleInput = screen.getByPlaceholderText(/es: Partenza 10:00/i);
    fireEvent.change(scheduleInput, { target: { value: '10:00' } });
    fireEvent.click(screen.getByText(/Avanti/i)); // Travel -> Final

    // Final Step - Conferma
    fireEvent.click(screen.getByRole('button', { name: /Conferma Presenza/i }));

    await waitFor(() => {
      expect(submitRSVP).toHaveBeenCalledWith(
        'confirmed',
        expect.any(Boolean),
        false,
        expect.objectContaining({
          guest_updates: expect.objectContaining({
            '0': expect.objectContaining({
              dietary_requirements: 'No Noci'
            })
          })
        })
      );
    });
  });
});