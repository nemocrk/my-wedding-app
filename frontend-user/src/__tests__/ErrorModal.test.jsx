import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ErrorModal from '../components/common/ErrorModal';

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
});
