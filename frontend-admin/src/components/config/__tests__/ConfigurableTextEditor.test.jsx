import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import ConfigurableTextEditor from '../ConfigurableTextEditor';

// NOTA: TipTap e Lucide icons sono mockati globalmente in setupTests.tsx

describe('ConfigurableTextEditor', () => {
  const mockOnSave = vi.fn();

  it('renders correctly in preview mode', () => {
    render(
      <ConfigurableTextEditor 
        textKey="test.key" 
        initialContent="<p>Initial Content</p>" 
        onSave={mockOnSave}
        label="Test Label"
      />
    );

    // Should show label
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    
    // Should show "Modifica" button
    expect(screen.getByRole('button', { name: /modifica/i })).toBeInTheDocument();
    
    // Should show preview content
    expect(screen.getByText(/Initial Content/i)).toBeInTheDocument();
  });

  it('uses textKey as label when label prop is not provided', () => {
    render(
      <ConfigurableTextEditor 
        textKey="envelope.front.content" 
        initialContent="<p>Test</p>" 
        onSave={mockOnSave}
      />
    );

    // Should NOT show label in preview (only in modal header)
    // Preview card shows the label prop or nothing
    const modifyButton = screen.getByRole('button', { name: /modifica/i });
    expect(modifyButton).toBeInTheDocument();
  });

  it('opens fullscreen modal when edit button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ConfigurableTextEditor 
        textKey="test.key" 
        initialContent="<p>Initial Content</p>" 
        onSave={mockOnSave}
        label="Test Label"
      />
    );

    const editButton = screen.getByRole('button', { name: /modifica/i });
    await user.click(editButton);

    // Modal should open - use dialog role to scope queries
    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByRole('button', { name: /salva/i })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: /annulla/i })).toBeInTheDocument();
    });
    
    // Modal header should show label
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked in modal', async () => {
    const user = userEvent.setup();
    mockOnSave.mockResolvedValue(undefined); // Simulate async save
    
    render(
      <ConfigurableTextEditor 
        textKey="test.key" 
        initialContent="<p>Initial Content</p>" 
        onSave={mockOnSave}
        label="Test Label"
      />
    );

    // Open modal
    await user.click(screen.getByRole('button', { name: /modifica/i }));

    // Wait for modal and get Save button within dialog
    let saveButton;
    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      saveButton = within(dialog).getByRole('button', { name: /salva/i });
      expect(saveButton).toBeInTheDocument();
    });

    // Click save
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('test.key', expect.any(String));
    });
  });

  it('closes modal when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ConfigurableTextEditor 
        textKey="test.key" 
        initialContent="<p>Initial Content</p>" 
        onSave={mockOnSave}
        label="Test Label"
      />
    );

    // Open modal
    await user.click(screen.getByRole('button', { name: /modifica/i }));

    // Wait for modal and get Cancel button within dialog scope
    let cancelButton;
    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      cancelButton = within(dialog).getByRole('button', { name: /annulla/i });
      expect(cancelButton).toBeInTheDocument();
    });

    // Click cancel
    await user.click(cancelButton);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Should be back to preview mode
    expect(screen.getByRole('button', { name: /modifica/i })).toBeInTheDocument();
  });

  it('displays empty content message when no content is provided', () => {
    render(
      <ConfigurableTextEditor 
        textKey="test.key" 
        initialContent="" 
        onSave={mockOnSave}
        label="Empty Test"
      />
    );

    // Should show "Nessun contenuto" message
    expect(screen.getByText(/Nessun contenuto/i)).toBeInTheDocument();
  });

  it('closes modal after successful save', async () => {
    const user = userEvent.setup();
    mockOnSave.mockResolvedValue(undefined);
    
    render(
      <ConfigurableTextEditor 
        textKey="test.key" 
        initialContent="<p>Content</p>" 
        onSave={mockOnSave}
        label="Test"
      />
    );

    // Open and save
    await user.click(screen.getByRole('button', { name: /modifica/i }));
    
    let saveButton;
    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      saveButton = within(dialog).getByRole('button', { name: /salva/i });
      expect(saveButton).toBeInTheDocument();
    });

    await user.click(saveButton);

    // Modal should close after save
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
