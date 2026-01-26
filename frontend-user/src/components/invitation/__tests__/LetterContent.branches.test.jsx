import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LetterContent from '../LetterContent';
import * as apiService from '../../../services/api';

// --- MOCKS ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

vi.mock('../../contexts/TextContext', () => ({
  useConfigurableText: () => ({
    getText: (key, fallback) => fallback || `[${key}]`,
  }),
}));

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

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
  useAnimation: () => ({ start: vi.fn() }),
}));

// --- MOCK DATA ---
const mockData = {
  status: 'sent',
  name: 'Branch Tester',
  guests: [
    { first_name: 'Guest', last_name: 'One', is_child: false, dietary_requirements: 'None' },
    { first_name: 'Guest', last_name: 'Two', is_child: true } // No dietary, no last name check
  ],
  phone_number: '',
  whatsapp: { whatsapp_number: '12345', whatsapp_name: 'Sposi' },
  accommodation_offered: true,
  accommodation_requested: false,
  travel_info: null
};

describe('LetterContent Branch Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // BRANCH SET 1: Guest Management Edge Cases (Lines 116-151)
  it('handles guest with missing last_name and dietary requirements', async () => {
    const dataMissingFields = {
      ...mockData,
      guests: [{ first_name: 'OnlyName', is_child: false }] // Missing last_name, dietary
    };
    render(<LetterContent data={dataMissingFields} />);
    
    // Open RSVP
    fireEvent.click(screen.getByText('cards.rsvp.title'));
    
    // Edit guest
    await waitFor(() => {
        fireEvent.click(screen.getAllByText('✏️')[0]);
    });

    // Check inputs are empty (fallback to '')
    const lastNameInput = screen.getByPlaceholderText('rsvp.labels.lastname_placeholder');
    expect(lastNameInput.value).toBe('');
    
    const dietaryInput = screen.getByPlaceholderText('rsvp.labels.dietary_placeholder');
    expect(dietaryInput.value).toBe('');
    
    // Save without changes to trigger fallback logic in save handler
    fireEvent.click(screen.getAllByText('✓')[0]);
    
    // Verify display name logic handles missing last name
    expect(screen.getByText('OnlyName')).toBeInTheDocument();
  });

  // BRANCH SET 2: Phone Validation Paths (Lines 188-219)
  it('handles phone editing scenarios and invalid inputs', async () => {
    const user = userEvent.setup();
    const dataWithPhone = { ...mockData, phone_number: '+393331234567' };
    render(<LetterContent data={dataWithPhone} />);
    
    // Navigate to Contact Step
    fireEvent.click(screen.getByText('cards.rsvp.title'));
    fireEvent.click(screen.getByText('rsvp.buttons.next'));
    
    // 1. Start Edit with existing phone (Branch 18: if !phoneNumber)
    // Here phoneNumber exists, so it should populate tempPhoneNumber
    const editBtn = screen.getByText('✏️');
    fireEvent.click(editBtn);
    
    const input = screen.getByPlaceholderText('+39 333 1234567');
    expect(input.value).toBe('+393331234567');
    
    // 2. Test Invalid Regex (Branch 21: regex test failure)
    await user.clear(input);
    await user.type(input, '123'); // Too short
    
    fireEvent.click(screen.getByText('✓'));
    expect(screen.getByText('rsvp.validation.phone_invalid')).toBeInTheDocument();
    
    // 3. Test Empty input (Branch: !trimmed)
    await user.clear(input);
    fireEvent.click(screen.getByText('✓'));
    expect(screen.getByText('rsvp.validation.phone_required')).toBeInTheDocument();
  });

  // BRANCH SET 3: Travel Logic (Lines 231-273)
  it('handles conditional travel fields rendering', async () => {
    render(<LetterContent data={mockData} />);
    
    // Navigate to Travel
    fireEvent.click(screen.getByText('cards.rsvp.title'));
    fireEvent.click(screen.getByText('rsvp.buttons.next'));
    fireEvent.click(screen.getByText('rsvp.buttons.next')); // Contact -> Travel (assuming valid phone/guests)
    
    // 1. Select Ferry -> Check Car Option logic
    const ferryRadio = screen.getByLabelText('rsvp.options.ferry');
    fireEvent.click(ferryRadio);
    
    // Toggle Car Option 'proprio'
    const carCheckbox = screen.getByLabelText('rsvp.options.car_with');
    fireEvent.click(carCheckbox); // Checked
    expect(carCheckbox).toBeChecked();
    
    // This should hide Carpool interest (Branch 273: if !car_option)
    expect(screen.queryByText('rsvp.options.carpool_interest')).not.toBeInTheDocument();
    
    // Uncheck Car Option -> Carpool should appear
    fireEvent.click(carCheckbox); // Unchecked
    expect(screen.getByText('rsvp.options.carpool_interest')).toBeInTheDocument();
  });

  // BRANCH SET 4: WhatsApp Alerts (Lines 300-348)
  it('shows WhatsApp alert when modifying confirmed status drastically', async () => {
    // 1. Confirmed user excluding all guests
    const confirmedData = { ...mockData, status: 'confirmed' };
    const { rerender } = render(<LetterContent data={confirmedData} />);
    
    fireEvent.click(screen.getByText('cards.rsvp.title'));
    
    // Go to Modify
    fireEvent.click(screen.getByText('rsvp.buttons.modify_answer'));
    
    // Exclude all guests
    const excludeBtns = screen.getAllByText('✕');
    excludeBtns.forEach(btn => fireEvent.click(btn));
    
    // Check Alert (Branch 300)
    expect(screen.getByText('whatsapp.alert_modify_confirmed')).toBeInTheDocument();
    
    // Cleanup for next test part
    render(<LetterContent data={{ ...mockData, accommodation_requested: true, status: 'confirmed' }} />);
    
    // Navigate to Accommodation step
    fireEvent.click(screen.getByText('cards.rsvp.title'));
    fireEvent.click(screen.getByText('rsvp.buttons.modify_answer')); // Guests
    fireEvent.click(screen.getByText('rsvp.buttons.next')); // Contact
    fireEvent.click(screen.getByText('rsvp.buttons.next')); // Travel
    fireEvent.click(screen.getByText('rsvp.buttons.next')); // Accommodation
    
    // Deselect previously requested accommodation (Branch 348)
    const accCheckbox = screen.getByLabelText('rsvp.options.accommodation_yes');
    fireEvent.click(accCheckbox); // Uncheck
    
    expect(screen.getByText('whatsapp.alert_modify_confirmed')).toBeInTheDocument();
  });
  
   // BRANCH SET 5: Declining after Confirmed
   it('shows alert when changing from confirmed to declined', async () => {
     const confirmedData = { ...mockData, status: 'declined' }; // Simuliamo stato declined visualizzato
     render(<LetterContent data={confirmedData} />);
     
     fireEvent.click(screen.getByText('cards.rsvp.title'));
     
     // In summary page for declined status, verify alert
     expect(screen.getByText('whatsapp.alert_confirm_after_decline')).toBeInTheDocument();
   });
});
