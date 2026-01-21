import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import LetterContent from '../components/invitation/LetterContent';
import { useConfigurableText } from '../contexts/TextContext';
import { submitRSVP } from '../services/api';
import { logInteraction } from '../services/analytics';

// Mock delle dipendenze
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'rsvp.labels.dietary_requirements': 'Intolleranze Alimentari',
        'rsvp.labels.dietary_placeholder': 'Inserisci allergie o intolleranze...',
        'rsvp.buttons.next': 'Avanti',
        'rsvp.buttons.confirm_presence': 'Conferma Presenza',
        'rsvp.labels.guests': 'Ospiti'
      };
      return translations[key] || key;
    }
  })
}));

vi.mock('../contexts/TextContext', () => ({
  useConfigurableText: vi.fn()
}));

vi.mock('../services/api', () => ({
  submitRSVP: vi.fn()
}));

vi.mock('../services/analytics', () => ({
  logInteraction: vi.fn(),
  heatmapTracker: { start: vi.fn(), stop: vi.fn() }
}));

// Mock di immagini
vi.mock('../assets/illustrations/arch.png', () => 'arch.png');
vi.mock('../assets/illustrations/chest.png', () => 'chest.png');
vi.mock('../assets/illustrations/dress.png', () => 'dress.png');
vi.mock('../assets/illustrations/home.png', () => 'home.png');
vi.mock('../assets/illustrations/LetterBackground.png', () => 'LetterBackground.png');
vi.mock('../assets/illustrations/questions.png', () => 'questions.png');
vi.mock('../assets/illustrations/van.png', () => 'van.png');
vi.mock('../assets/illustrations/wax.png', () => 'wax.png');

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
    useConfigurableText.mockReturnValue({
      getText: (key, defaultText) => defaultText || key
    });
    submitRSVP.mockResolvedValue({ success: true, message: 'RSVP Aggiornato' });
    logInteraction.mockClear();
  });

  it('dovrebbe mostrare il badge intolleranze se presente', async () => {
    render(<LetterContent data={mockData} />);

    // Apri la card RSVP
    const rsvpCard = screen.getByText('RSVP');
    fireEvent.click(rsvpCard);

    // Verifica che Luigi abbia il badge
    await waitFor(() => {
      expect(screen.getByText(/Gluten Free/i)).toBeInTheDocument();
    });
  });

  it('dovrebbe permettere di modificare le intolleranze di un ospite', async () => {
    render(<LetterContent data={mockData} />);

    // Apri RSVP
    fireEvent.click(screen.getByText('RSVP'));

    // Clicca edit su Mario (primo ospite, indice 0)
    const editButtons = screen.getAllByText('✏️');
    fireEvent.click(editButtons[0]);

    // Trova la textarea delle intolleranze
    const dietaryInput = screen.getByPlaceholderText('Inserisci allergie o intolleranze...');
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

    // Apri RSVP
    fireEvent.click(screen.getByText('RSVP'));

    // Step 1: Modifica intolleranza Mario
    const editButtons = screen.getAllByText('✏️');
    fireEvent.click(editButtons[0]);
    const dietaryInput = screen.getByPlaceholderText('Inserisci allergie o intolleranze...');
    fireEvent.change(dietaryInput, { target: { value: 'No Noci' } });
    fireEvent.click(screen.getByText('✓'));

    // Avanza negli step (Guests -> Contact -> Travel -> Final)
    fireEvent.click(screen.getByText('Avanti')); // Guests -> Contact

    // Contact Step
    const phoneInput = screen.getByText('✏️');
    fireEvent.click(phoneInput);
    const phoneField = screen.getByPlaceholderText('+39 333 1234567');
    fireEvent.change(phoneField, { target: { value: '+393331234567' } });
    fireEvent.click(screen.getByText('✓'));
    fireEvent.click(screen.getByText('Avanti')); // Contact -> Travel

    // Travel Step
    const ferryOption = screen.getByLabelText(/traghetto/i); // Assumendo key translation fallback
    fireEvent.click(ferryOption);
    const scheduleInput = screen.getByPlaceholderText(/schedule/i);
    fireEvent.change(scheduleInput, { target: { value: '10:00' } });
    fireEvent.click(screen.getByText('Avanti')); // Travel -> Final

    // Final Step - Conferma
    fireEvent.click(screen.getByText('Conferma Presenza'));

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