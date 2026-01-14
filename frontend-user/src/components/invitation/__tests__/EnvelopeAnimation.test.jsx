import '../../../test/setup.jsx'; // Import i18n and TextContext mocks (corrected extension)
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EnvelopeAnimation from '../EnvelopeAnimation';

describe('EnvelopeAnimation Component', () => {
  it('renders the envelope images and elements correctly', () => {
    const onCompleteMock = vi.fn();
    render(<EnvelopeAnimation onComplete={onCompleteMock} />);
    
    // Verifichiamo la presenza del sigillo tramite alt text (nuova implementazione con immagini PNG)
    const sealImage = screen.getByAltText('Wax Seal');
    expect(sealImage).toBeInTheDocument();
    expect(sealImage).toHaveClass('wax-img');
    
    // Verifichiamo la presenza degli altri layer della busta
    const pocketImage = screen.getByAltText('Pocket');
    expect(pocketImage).toBeInTheDocument();

    const flapImage = screen.getByAltText('Flap');
    expect(flapImage).toBeInTheDocument();

    // Verifichiamo che senza dati mostri lo stato di caricamento (ora tradotto)
    expect(screen.getByText('Caricamento...')).toBeInTheDocument();
  });
});