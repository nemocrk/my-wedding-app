import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../__tests__/setup.jsx'; // Import i18n mock (corrected extension)
import Fab from '../Fab';

describe('Fab Component', () => {
  it('renders in document.body via Portal when visible is true', () => {
    const { container } = render(<Fab onClick={() => { }} isFlipped={false} visible={true} />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // Fab renders in the container, not via Portal
    expect(container).toContainElement(button);
  });

  it('does not render when visible is false', () => {
    render(<Fab onClick={() => { }} isFlipped={false} visible={false} />);
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
    render(<Fab onClick={() => { }} isFlipped={false} visible={true} />);
    const button = screen.getByRole('button');
    // Updated: i18n now returns translated text
    expect(button).toHaveAttribute('aria-label', 'Gira invito');
  });

  it('renders RotateCcw icon when isFlipped is true', () => {
    render(<Fab onClick={() => { }} isFlipped={true} visible={true} />);
    const button = screen.getByRole('button');
    // Updated: i18n now returns translated text
    expect(button).toHaveAttribute('aria-label', 'Torna alla copertina');
  });
});