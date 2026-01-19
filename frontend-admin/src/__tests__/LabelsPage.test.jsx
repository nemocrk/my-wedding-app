import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LabelsPage from '../pages/LabelsPage';
import { api } from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

// Mock Translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
        const translations = {
            'labels.title': 'Gestione Etichette',
            'labels.create': 'Nuova Etichetta',
            'common.actions': 'Azioni',
            'common.edit': 'Modifica',
            'common.delete': 'Elimina',
            'common.save': 'Salva',
            'common.cancel': 'Annulla'
        };
        return translations[key] || key;
    }
  }),
}));

describe('LabelsPage', () => {
  const mockLabels = [
    { id: 1, name: 'VIP', color: '#FF0000' },
    { id: 2, name: 'Family', color: '#00FF00' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: mockLabels });
  });

  it('renders labels list correctly', async () => {
    render(<LabelsPage />);
    
    // Check loading/initial render
    expect(screen.getByText('Gestione Etichette')).toBeInTheDocument();
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('VIP')).toBeInTheDocument();
      expect(screen.getByText('Family')).toBeInTheDocument();
    });
    
    expect(api.get).toHaveBeenCalledWith('/invitation-labels/');
  });

  it('opens create modal and submits new label', async () => {
    api.post.mockResolvedValue({ data: { id: 3, name: 'Friends', color: '#0000FF' } });
    api.get.mockResolvedValueOnce({ data: mockLabels }).mockResolvedValueOnce({ 
        data: [...mockLabels, { id: 3, name: 'Friends', color: '#0000FF' }] 
    });

    render(<LabelsPage />);
    
    // Open Modal
    const createBtn = screen.getByText('Nuova Etichetta');
    fireEvent.click(createBtn);
    
    // Fill Form
    const nameInput = screen.getByPlaceholderText('Nome etichetta');
    fireEvent.change(nameInput, { target: { value: 'Friends' } });
    
    // Submit
    const saveBtn = screen.getByText('Salva');
    fireEvent.click(saveBtn);
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/invitation-labels/', { 
        name: 'Friends', color: '#CCCCCC' // Default color check
      });
    });
  });

  it('handles label deletion', async () => {
    api.delete.mockResolvedValue({});
    api.get.mockResolvedValueOnce({ data: mockLabels }).mockResolvedValueOnce({ 
        data: [mockLabels[0]] // Remove second label
    });

    render(<LabelsPage />);
    
    await waitFor(() => screen.getByText('Family'));
    
    // Click Delete on second item
    const deleteBtns = screen.getAllByText('Elimina'); // Assuming button text or title
    fireEvent.click(deleteBtns[1]); 
    
    // Confirm (Mock window.confirm if used, or custom modal)
    // Assuming simple button click for now based on typical implementation, 
    // or if a confirmation dialog exists, we need to target it.
    // For this test, let's assume the component uses a confirmation modal or direct delete.
    // Adjusting based on standard admin UIs: usually a confirm dialog appears.
    
    // If standard window.confirm:
    // vi.spyOn(window, 'confirm').mockImplementation(() => true);
    
    // If Custom Modal: find confirm button in modal. 
    // Let's assume the delete button directly calls api for this simple test case
    // or check if a confirmation appears.
    
    // Re-verify logic based on typical implementation:
    expect(api.delete).toHaveBeenCalledWith('/invitation-labels/2/');
  });
});
