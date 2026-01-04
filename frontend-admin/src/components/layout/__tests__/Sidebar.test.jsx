import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';

describe('Sidebar Component', () => {
  const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('renders navigation links correctly', () => {
    renderWithRouter(<Sidebar />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Inviti')).toBeInTheDocument();
    expect(screen.getByText('Alloggi')).toBeInTheDocument();
    expect(screen.getByText('Configurazione')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('applies active class to current route', () => {
    // Manually set URL to /dashboard to test active state
    window.history.pushState({}, 'Test Page', '/dashboard');
    renderWithRouter(<Sidebar />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveClass('bg-pink-50');
    expect(dashboardLink).toHaveClass('text-pink-700');

    const invitationsLink = screen.getByText('Inviti').closest('a');
    expect(invitationsLink).not.toHaveClass('bg-pink-50');
  });
});
