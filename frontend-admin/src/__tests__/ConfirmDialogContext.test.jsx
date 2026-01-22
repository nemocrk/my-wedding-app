import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmDialogProvider, useConfirm } from '../contexts/ConfirmDialogContext';

// Test Component
const TestComponent = () => {
  const { confirm } = useConfirm();
  const [result, setResult] = React.useState(null);

  const handleAction = async () => {
    const isConfirmed = await confirm({
      title: 'Test Title',
      message: 'Test Message',
    });
    setResult(isConfirmed ? 'Confirmed' : 'Cancelled');
  };

  return (
    <div>
      <button onClick={handleAction}>Trigger Confirm</button>
      <div data-testid="result">{result}</div>
    </div>
  );
};

describe('ConfirmDialogContext', () => {
  it('opens modal and handles confirmation', async () => {
    render(
      <ConfirmDialogProvider>
        <TestComponent />
      </ConfirmDialogProvider>
    );

    // Initial state
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();

    // Trigger modal
    fireEvent.click(screen.getByText('Trigger Confirm'));

    // Verify modal content
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Message')).toBeInTheDocument();

    // Click confirm
    fireEvent.click(screen.getByText('Conferma'));

    // Verify result
    await waitFor(() => {
      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
      expect(screen.getByTestId('result')).toHaveTextContent('Confirmed');
    });
  });

  it('opens modal and handles cancellation', async () => {
    render(
      <ConfirmDialogProvider>
        <TestComponent />
      </ConfirmDialogProvider>
    );

    fireEvent.click(screen.getByText('Trigger Confirm'));
    expect(screen.getByText('Test Title')).toBeInTheDocument();

    // Click cancel
    fireEvent.click(screen.getByText('Annulla'));

    await waitFor(() => {
      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
      expect(screen.getByTestId('result')).toHaveTextContent('Cancelled');
    });
  });
});
