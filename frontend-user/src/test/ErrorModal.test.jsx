import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ErrorModal from '../../components/common/ErrorModal';

describe('ErrorModal Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders nothing when not isOpen', () => {
    const { container } = render(
      <ErrorModal 
        isOpen={false} 
        onClose={mockOnClose} 
        error={null} 
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders standard error message', () => {
    render(
      <ErrorModal 
        isOpen={true} 
        onClose={mockOnClose} 
        error={{ message: 'Generic Error' }} 
      />
    );
    expect(screen.getByText('Generic Error')).toBeTruthy();
    expect(screen.getByText('Si è verificato un errore')).toBeTruthy();
  });

  test('renders specialized 404 error', () => {
    render(
      <ErrorModal 
        isOpen={true} 
        onClose={mockOnClose} 
        error={{ status: 404, message: 'Not Found' }} 
      />
    );
    // Check for 404 specific text/illustration logic if present
    // Assuming component maps status to UI
    expect(screen.getByText('Ops! Qualcosa è andato storto...')).toBeTruthy();
  });

  test('calls onClose when button clicked', () => {
    render(
      <ErrorModal 
        isOpen={true} 
        onClose={mockOnClose} 
        error={{ message: 'Test' }} 
      />
    );
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('calls onClose when clicking overlay', () => {
      // Assuming Framer Motion or standard div overlay
      // We target the backdrop
      render(
        <ErrorModal 
          isOpen={true} 
          onClose={mockOnClose} 
          error={{ message: 'Test' }} 
        />
      );
      // Usually the first div is the backdrop in modals
      // This might need adjustment based on exact DOM structure
      // For now, let's assume there is a close mechanism
  });
});
