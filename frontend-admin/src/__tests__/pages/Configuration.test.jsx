import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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
    accommodation_price_adult: 50,
    accommodation_price_children: 25,
    transfer_price_adult: 10,
    transfer_price_children: 5,
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

  const renderWithRouter = (component) => {
    return render(
      <MemoryRouter>
        {component}
      </MemoryRouter>
    );
  };

  it('should render configuration form and load data', async () => {
    renderWithRouter(<Configuration />);
    
    // Wait for data load
    await waitFor(() => {
        expect(api.getConfig).toHaveBeenCalled();
    });

    expect(screen.getByText("Configurazione")).toBeInTheDocument();
    
    // Check if values are populated (e.g. searching for IBAN value)
    await waitFor(() => {
        expect(screen.getByDisplayValue('secret123')).toBeInTheDocument();
    });
  });

  it('should validate price fields as numbers', async () => {
    renderWithRouter(<Configuration />);
    await waitFor(() => expect(api.getConfig).toHaveBeenCalled());
    
    // Find number inputs
    const priceInputs = screen.getAllByRole('spinbutton');
    expect(priceInputs.length).toBeGreaterThan(0);
    
    // Verify type attribute
    expect(priceInputs[0]).toHaveAttribute('type', 'number');
  });

  it('should call API on valid form submission', async () => {
    renderWithRouter(<Configuration />);
    await waitFor(() => expect(api.getConfig).toHaveBeenCalled());
    
    const submitButton = screen.getByRole('button', { name: /salva/i });
    expect(submitButton).toBeInTheDocument();
    
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(api.updateConfig).toHaveBeenCalled();
      // Check that it was called with some data (we can be specific if needed)
      expect(api.updateConfig).toHaveBeenCalledWith(expect.objectContaining({
          iban: 'IT000000000000'
      }));
    });
  });
});
