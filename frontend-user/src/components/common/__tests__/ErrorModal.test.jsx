import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
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
    expect(screen.getByText('common.error_modal.default_user_message')).toBeInTheDocument();
  });

  test('toggles technical details with animation simulation', async () => {
    const error = { message: 'Technical Error 500' };
    render(<ErrorModal error={error} onClose={mockOnClose} />);

    // Initial state: Show Details button exists
    const toggleBtn = screen.getByText('common.error_modal.show_technical_data');
    expect(toggleBtn).toBeInTheDocument();
    
    // Click toggle to SHOW
    fireEvent.click(toggleBtn);

    // Now should show "Hide" text
    await waitFor(() => {
        expect(screen.getByText('common.error_modal.hide_technical_data')).toBeInTheDocument();
    });

    // Click toggle to HIDE again
    fireEvent.click(screen.getByText('common.error_modal.hide_technical_data'));
    
    await waitFor(() => {
        expect(screen.getByText('common.error_modal.show_technical_data')).toBeInTheDocument();
    });
  });

  test('handles error object without message (JSON stringify fallback)', async () => {
    const errorObj = { code: 123, status: 'Fail' };
    render(<ErrorModal error={errorObj} onClose={mockOnClose} />);

    const toggleBtn = screen.getByText('common.error_modal.show_technical_data');
    fireEvent.click(toggleBtn);

    await waitFor(() => {
        // Should verify JSON string presence
        expect(screen.getByText(/"code": 123/)).toBeVisible();
    });
  });

  test('calls onClose on button click', () => {
    const error = { message: 'Err' };
    render(<ErrorModal error={error} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('common.error_modal.button'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('calls onClose on X icon click (Hover interactions)', () => {
    const error = { message: 'Err' };
    render(<ErrorModal error={error} onClose={mockOnClose} />);

    // Find X button (usually first button in header)
    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons[0];

    // Simulate hover for coverage (though logic is in CSS/Style usually, inline events need firing)
    fireEvent.mouseOver(xButton);
    fireEvent.mouseOut(xButton);

    fireEvent.click(xButton); 
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('simulates hover on action button', () => {
    const error = { message: 'Err' };
    render(<ErrorModal error={error} onClose={mockOnClose} />);
    
    const actionBtn = screen.getByText('common.error_modal.button');
    fireEvent.mouseOver(actionBtn);
    fireEvent.mouseOut(actionBtn);
  });
});
