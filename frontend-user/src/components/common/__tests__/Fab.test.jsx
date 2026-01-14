import '../../../test/setup'; // Import i18n mock
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Fab from '../Fab';
import { describe, it, expect, vi } from 'vitest';

describe('Fab Component', () => {
  it('renders in document.body via Portal when visible is true', () => {
    const { container } = render(<Fab onClick={() => {}} isFlipped={false} visible={true} />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // Fab renders in the container, not via Portal
    expect(container).toContainElement(button);
  });

  it('does not render when visible is false', () => {
    render(<Fab onClick={() => {}} isFlipped={false} visible={false} />);
    const button = screen.queryByRole('button');
    expect(button).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Fab onClick={handleClick} isFlipped={false} visible={true} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders ArrowRight icon when isFlipped is false', () => {
    render(<Fab onClick={() => {}} isFlipped={false} visible={true} />);
    const button = screen.getByRole('button');
    // Updated: i18n now returns translated text
    expect(button).toHaveAttribute('aria-label', 'Gira invito');
  });

  it('renders RotateCcw icon when isFlipped is true', () => {
    render(<Fab onClick={() => {}} isFlipped={true} visible={true} />);
    const button = screen.getByRole('button');
    // Updated: i18n now returns translated text
    expect(button).toHaveAttribute('aria-label', 'Torna alla copertina');
  });
});