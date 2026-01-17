import { render, screen } from '@testing-library/react';
import GoogleFontPicker from '../components/ui/GoogleFontPicker';

describe('GoogleFontPicker', () => {
  it('renders with fallback when apiKey is missing', () => {
    render(<GoogleFontPicker apiKey={undefined} activeFamily="Open Sans" onSelect={() => {}} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
