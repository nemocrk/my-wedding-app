import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EnvelopeAnimation from '../EnvelopeAnimation';

describe('EnvelopeAnimation Component', () => {
  it('renders the envelope SVG and elements correctly', () => {
    const onCompleteMock = vi.fn();
    render(<EnvelopeAnimation onComplete={onCompleteMock} />);
    
    // Verifichiamo la presenza del sigillo tramite il testo
    const sealHeart = screen.getByText('♥');
    expect(sealHeart).toBeInTheDocument();
    
    // Verifichiamo che il container dell'animazione sia presente
    // L'SVG non ha un ruolo accessibile di default, ma possiamo verificare che il rendering avvenga
    const svgElement = sealHeart.closest('svg');
    expect(svgElement).toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const onCompleteMock = vi.fn();
    const { container } = render(<EnvelopeAnimation onComplete={onCompleteMock} />);
    expect(container).toMatchSnapshot();
  });
});
