import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Configuration from '../../pages/Configuration';
import { BrowserRouter } from 'react-router-dom';

// Hoist mocks to ensure they are available before import
const { mockUpdateConfig, mockGetConfig } = vi.hoisted(() => ({
  mockUpdateConfig: vi.fn(),
  mockGetConfig: vi.fn()
}));

// Mock the API module correctly matching api.js structure
vi.mock('../../services/api', () => ({
  api: {
    getConfig: mockGetConfig,
    updateConfig: mockUpdateConfig
  }
}));

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
    mockGetConfig.mockResolvedValue(mockConfigData);
    mockUpdateConfig.mockResolvedValue({ success: true, message: 'Config updated' });
  });

  const renderWithRouter = (component) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  it('should render configuration form and load data', async () => {
    renderWithRouter(<Configuration />);
    
    // Wait for data load
    await waitFor(() => {
        expect(mockGetConfig).toHaveBeenCalled();
    });

    expect(screen.getByText("Configurazione")).toBeInTheDocument();
    
    // Check if values are populated (e.g. searching for IBAN value)
    await waitFor(() => {
        expect(screen.getByDisplayValue('secret123')).toBeInTheDocument();
    });
  });

  it('should validate price fields as numbers', async () => {
    renderWithRouter(<Configuration />);
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());
    
    // Find number inputs
    const priceInputs = screen.getAllByRole('spinbutton');
    expect(priceInputs.length).toBeGreaterThan(0);
    
    // Verify type attribute
    expect(priceInputs[0]).toHaveAttribute('type', 'number');
  });

  it('should call API on valid form submission', async () => {
    renderWithRouter(<Configuration />);
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());
    
    const submitButton = screen.getByRole('button', { name: /salva/i });
    expect(submitButton).toBeInTheDocument();
    
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalled();
      // Check that it was called with some data (we can be specific if needed)
      expect(mockUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({
          iban: 'IT000000000000'
      }));
    });
  });
});
