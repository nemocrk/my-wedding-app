import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test-utils';

// CRITICAL: Hoist mocks calls BEFORE component imports
vi.mock('../../services/api', () => ({
  api: {
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    // Add missing methods that might be called by child components (TextConfigWidget)
    fetchLanguages: vi.fn().mockResolvedValue([]),
    fetchConfigurableTexts: vi.fn().mockResolvedValue([]),
    getConfigurableText: vi.fn(),
    createConfigurableText: vi.fn(),
    updateConfigurableText: vi.fn(),
    deleteConfigurableText: vi.fn(),
  }
}));

import Configuration from '../../pages/Configuration';
import { api } from '../../services/api';

describe('Configuration Page', () => {
  const mockConfigData = {
    invitation_link_secret: 'secret123',
    unauthorized_message: 'Access Denied',
    letter_text: 'Welcome',
    whatsapp_groom_number: '+393331234567',
    whatsapp_bride_number: '+393337654321',
    whatsapp_groom_firstname: 'Groom',
    whatsapp_bride_firstname: 'Bride',
    price_adult_meal: 50,
    price_child_meal: 25,
    price_accommodation_adult: 60,
    price_accommodation_child: 30,
    price_transfer: 10,
    whatsapp_rate_limit: 10,
    iban: 'IT000000000000',
    iban_holder: 'Holder Name'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.getConfig.mockResolvedValue(mockConfigData);
    api.updateConfig.mockResolvedValue({ success: true, message: 'Config updated' });
    api.fetchLanguages.mockResolvedValue([]);
    api.fetchConfigurableTexts.mockResolvedValue([]);
  });

  it('should render configuration form and load data', async () => {
    render(<Configuration />);

    // Wait for data load AND component rendering completion
    await waitFor(() => {
      expect(api.getConfig).toHaveBeenCalled();
    });

    // Wait for the loading state to finish (component exits loading when rendering form)
    await waitFor(() => {
      expect(screen.getByText("Configurazione")).toBeInTheDocument();
    });

    // Check if values are populated (e.g. searching for secret value)
    await waitFor(() => {
      expect(screen.getByDisplayValue('secret123')).toBeInTheDocument();
    });
  });

  it('should validate price fields as numbers', async () => {
    render(<Configuration />);

    // Ensure component has fully loaded
    await waitFor(() => expect(api.getConfig).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByText("Configurazione")).toBeInTheDocument();
    });

    // Find number inputs
    const priceInputs = screen.getAllByRole('spinbutton');
    expect(priceInputs.length).toBeGreaterThan(0);

    // Verify type attribute
    expect(priceInputs[0]).toHaveAttribute('type', 'number');
  });

  it('should call API on valid form submission', async () => {
    render(<Configuration />);

    // Wait for API call
    await waitFor(() => expect(api.getConfig).toHaveBeenCalled());

    // Wait for component to finish rendering (exit loading state)
    await waitFor(() => {
      expect(screen.queryByText(/Caricamento configurazione/i)).not.toBeInTheDocument();
    });

    // Now the button should be rendered
    const submitButton = await screen.findByRole('button', { name: /salva/i });
    expect(submitButton).toBeInTheDocument();

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.updateConfig).toHaveBeenCalled();
      // Check that it was called with the mocked config data
      expect(api.updateConfig).toHaveBeenCalledWith(expect.objectContaining({
        invitation_link_secret: 'secret123'
      }));
    });
  });
});
