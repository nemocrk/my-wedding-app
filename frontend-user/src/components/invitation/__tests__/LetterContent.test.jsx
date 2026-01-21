import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LetterContent from '../LetterContent';
import { TextProvider } from '../../../contexts/TextContext';

// Mock delle dipendenze
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
        const translations = {
            'rsvp.hints.edit_guest_hint': 'Clicca sulla matita per modificare',
            'rsvp.steps.guests.title': 'Ospiti',
            'rsvp.buttons.next': 'Avanti'
        };
        return translations[key] || key;
    }
  }),
}));

jest.mock('../../../services/analytics', () => ({
  heatmapTracker: { start: jest.fn(), stop: jest.fn() },
  logInteraction: jest.fn(),
}));

jest.mock('../../../services/api', () => ({
  submitRSVP: jest.fn(),
}));

const mockData = {
  status: 'created',
  accommodation_requested: false,
  transfer_requested: false,
  phone_number: '',
  whatsapp: { whatsapp_number: '123', whatsapp_name: 'Test' },
  guests: [
    { first_name: 'Mario', last_name: 'Rossi', is_child: false, dietary_requirements: '' }
  ]
};

describe('LetterContent Component', () => {
  test('renders the guest edit hint in RSVP step 1', () => {
    render(
      <TextProvider>
        <LetterContent data={mockData} />
      </TextProvider>
    );

    // Apri RSVP (simulando click sulla card se necessario, ma qui inizializziamo lo stato)
    // Nota: LetterContent ha uno stato interno complesso.
    // Dobbiamo simulare l'apertura della card RSVP.
    
    // Siccome LetterContent renderizza le card "chiuse" (flip-card-back), 
    // dobbiamo trovare la card RSVP e cliccarci.
    const rsvpCard = screen.getByText(/RSVP/i);
    fireEvent.click(rsvpCard);

    // Ora dovrebbe essere aperto il modale RSVP allo step guests (default per status created)
    
    // Cerca l'hint
    const hintElement = screen.getByText(/\* Clicca sulla matita per modificare/i);
    expect(hintElement).toBeInTheDocument();
    
    // Verifica che abbia la classe corretta (se possibile testare le classi CSS modules/global)
    // In questo caso verifichiamo solo la presenza nel DOM per smoke test
  });
});
