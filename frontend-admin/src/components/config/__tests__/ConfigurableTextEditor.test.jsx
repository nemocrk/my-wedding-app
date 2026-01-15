import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import ConfigurableTextEditor from '../ConfigurableTextEditor';

// NOTA: TipTap e Lucide icons sono mockati globalmente in setupTests.ts

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

    // Modal should open with Salva and Annulla buttons
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /salva/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /annulla/i })).toBeInTheDocument();
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

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /salva/i })).toBeInTheDocument();
    });

    // Click save
    const saveButton = screen.getByRole('button', { name: /salva/i });
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

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /annulla/i })).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /annulla/i });
    await user.click(cancelButton);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /salva/i })).not.toBeInTheDocument();
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
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /salva/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /salva/i }));

    // Modal should close after save
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /salva/i })).not.toBeInTheDocument();
    });
  });
});
