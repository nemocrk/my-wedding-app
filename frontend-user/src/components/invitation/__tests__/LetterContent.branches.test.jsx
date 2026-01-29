import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../__tests__/setup.jsx'; // Import i18n and TextContext mocks
import { getTranslations as t } from '../../../__tests__/setup.jsx'; // Import i18n and TextContext mocks
import LetterContent from '../LetterContent';

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
    { id: 1, first_name: 'Guest', last_name: 'One', is_child: false, dietary_requirements: 'None' },
    { id: 2, first_name: 'Guest', last_name: 'Two', is_child: true } // No dietary, no last name check
  ],
  phone_number: '3939393933939',
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
    fireEvent.click(screen.getByText(`RSVP - ${t('rsvp.title')}`));

    // Edit guest
    await waitFor(() => {
      fireEvent.click(screen.getAllByText('✏️')[0]);
    });

    // Check inputs are empty (fallback to '')
    const lastNameInput = screen.getByPlaceholderText(t('rsvp.labels.lastname_placeholder'));
    expect(lastNameInput.value).toBe('');

    const dietaryInput = screen.getByPlaceholderText(t('rsvp.labels.dietary_placeholder'));
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
    fireEvent.click(screen.getByText(`RSVP - ${t('rsvp.title')}`));
    fireEvent.click(screen.getByText(t('rsvp.buttons.next')));

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
    expect(screen.getByText(t('rsvp.validation.phone_invalid'))).toBeInTheDocument();

    // 3. Test Empty input (Branch: !trimmed)
    await user.clear(input);
    fireEvent.click(screen.getByText('✓'));
    expect(screen.getByText(t('rsvp.validation.phone_required'))).toBeInTheDocument();
  });

  // BRANCH SET 3: Travel Logic (Lines 231-273)
  it('handles conditional travel fields rendering', async () => {
    render(<LetterContent data={mockData} />);

    // Navigate to Travel
    fireEvent.click(screen.getByText(`RSVP - ${t('rsvp.title')}`));
    fireEvent.click(screen.getByText(t('rsvp.buttons.next')));
    fireEvent.click(screen.getByText(t('rsvp.buttons.next'))); // Contact -> Travel (assuming valid phone/guests)

    // 1. Select Ferry -> Check Car Option logic
    const ferryRadio = screen.getByLabelText(t('rsvp.options.ferry'));
    fireEvent.click(ferryRadio);

    // Toggle Car Option 'proprio'
    const carCheckbox = screen.getByLabelText(t('rsvp.options.car_with'));
    fireEvent.click(carCheckbox); // Checked
    expect(carCheckbox).toBeChecked();

    // This should hide Carpool interest (Branch 273: if !car_option)
    expect(screen.queryByText(t('rsvp.options.carpool_interest'))).not.toBeInTheDocument();

    // Uncheck Car Option -> Carpool should appear
    fireEvent.click(carCheckbox); // Unchecked
    expect(screen.getByText(t('rsvp.options.carpool_interest'))).toBeInTheDocument();
  });

  // BRANCH SET 4: WhatsApp Alerts (Lines 300-348)
  it('shows WhatsApp alert when modifying confirmed status drastically', async () => {
    const user = userEvent.setup();
    // 1. Confirmed user excluding all guests
    const confirmedData = { ...mockData, status: 'confirmed' };
    const { rerender } = render(<LetterContent data={confirmedData} />);

    fireEvent.click(screen.getByText(`RSVP - ${t('rsvp.title')}`));

    // Go to Modify
    fireEvent.click(screen.getByText(t('rsvp.buttons.modify_answer')));

    // Exclude all guests
    const excludeBtns = screen.getAllByText('✕').filter(el => !el.classList.contains('close-modal-btn'));
    excludeBtns.forEach(btn => fireEvent.click(btn));

    fireEvent.click(screen.getByText(t('rsvp.buttons.next')));


    // Check Alert (Branch 300)
    await waitFor(() => {
      expect(screen.getByText(t('rsvp.validation.no_guests'))).toBeInTheDocument();
    });

    // Cleanup for next test part
    screen.getAllByText('✕').filter(el => !el.classList.contains('close-modal-btn')).forEach(btn => fireEvent.click(btn));
    rerender(<LetterContent data={{ ...mockData, accommodation_requested: true, status: 'confirmed' }} />);

    // Navigate to Accommodation step
    fireEvent.click(screen.getByText(`RSVP - ${t('rsvp.title')}`));
    fireEvent.click(screen.getByText(t('rsvp.buttons.modify_answer'))); // Guests
    fireEvent.click(screen.getByText(t('rsvp.buttons.next'))); // Contact
    fireEvent.click(screen.getByText(t('rsvp.buttons.next'))); // Travel
    const ferryRadio = screen.getByLabelText(t('rsvp.options.ferry'));
    fireEvent.click(ferryRadio);
    const scheduleInput = screen.getByPlaceholderText(/Partenza/i);
    await user.type(scheduleInput, 'Partenza 10:00');
    fireEvent.click(screen.getByText(t('rsvp.buttons.next'))); // Accommodation

    // Deselect previously requested accommodation (Branch 348)
    const accCheckbox = screen.getByLabelText(t('rsvp.options.accommodation_yes'));
    fireEvent.click(accCheckbox); // Uncheck

    expect(screen.getByText(t('whatsapp.alert_modify_confirmed'))).toBeInTheDocument();
  });

});
