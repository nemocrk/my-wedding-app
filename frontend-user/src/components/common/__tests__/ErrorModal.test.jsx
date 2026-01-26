import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import '../../../__tests__/setup.jsx';
import ErrorModal from '../ErrorModal';

describe('ErrorModal Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders nothing when error is null', () => {
    const { container } = render(
      <ErrorModal
        error={null}
        onClose={mockOnClose}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders userMessage when provided', () => {
    const error = { userMessage: 'Friendly Message', message: 'Tech Details' };
    render(<ErrorModal error={error} onClose={mockOnClose} />);

    expect(screen.getByText('Friendly Message')).toBeInTheDocument();
  });

  test('renders default message when userMessage missing', () => {
    const error = { message: 'Tech Details' };
    render(<ErrorModal error={error} onClose={mockOnClose} />);

    // Checks for translation key fallback (mocked) or default
    expect(screen.getByText('Non siamo riusciti a completare l\'operazione richiesta.')).toBeInTheDocument();
  });

  test('toggles technical details', async () => {
    const error = { message: 'Technical Error 500' };
    render(<ErrorModal error={error} onClose={mockOnClose} />);

    // Initial state: details hidden (impl check: max-height 0 or hidden class, but testing visibility via interaction)
    // Click toggle
    const toggleBtn = screen.getByText('Mostra dettagli errore');
    fireEvent.click(toggleBtn);

    // Now should show "Technical Error 500" and "Hide" text
    await waitFor(() => {
      expect(screen.getByText('Technical Error 500')).toBeVisible();
      expect(screen.getByText('Nascondi dettagli tecnici')).toBeInTheDocument();
    });

    // Close again
    fireEvent.click(screen.getByText('Nascondi dettagli tecnici'));
    await waitFor(() => {
      expect(screen.getByText('Mostra dettagli errore')).toBeInTheDocument();
    });
  });

  test('handles error object without message (JSON stringify fallback)', async () => {
    const errorObj = { code: 123, status: 'Fail' };
    render(<ErrorModal error={errorObj} onClose={mockOnClose} />);

    const toggleBtn = screen.getByText('Mostra dettagli errore');
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      // Should verify JSON string presence
      expect(screen.getByText(/"code": 123/)).toBeVisible();
    });
  });

  test('calls onClose on button click', () => {
    const error = { message: 'Err' };
    render(<ErrorModal error={error} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Ho capito, chiudi'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('calls onClose on X icon click', () => {
    const error = { message: 'Err' };
    render(<ErrorModal error={error} onClose={mockOnClose} />);

    // X icon usually inside a button in header
    // We can find by class or hierarchy, or assume it's the first button
    const closeButtons = screen.getAllByRole('button');
    // First button is X, Second is Toggle Details, Third is Action Button
    fireEvent.click(closeButtons[0]);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
