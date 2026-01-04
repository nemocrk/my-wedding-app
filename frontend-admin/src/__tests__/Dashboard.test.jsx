import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../pages/Dashboard';
import { api } from '../services/api';

// Mock API service
vi.mock('../services/api', () => ({
  api: {
    getDashboardStats: vi.fn(),
  },
}));

// Mock Recharts to avoid rendering issues in test environment
vi.mock('recharts', () => {
  const OriginalModule = vi.importActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => <div className="recharts-responsive-container">{children}</div>,
    PieChart: ({ children }) => <div className="recharts-pie-chart">{children}</div>,
    Pie: () => <div className="recharts-pie">Pie Chart Mock</div>,
    Cell: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

describe('Dashboard Component', () => {
  const mockStats = {
    guests: {
      adults_confirmed: 50,
      children_confirmed: 5,
      adults_pending: 20,
      children_pending: 2,
      adults_declined: 3,
      children_declined: 0,
    },
    logistics: {
      accommodation: { total_confirmed: 15 },
      transfer: { confirmed: 10 },
    },
    financials: {
      estimated_total: 15000,
      confirmed: 8000,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    // Return a promise that never resolves (or delays) to check loading state
    api.getDashboardStats.mockReturnValue(new Promise(() => {}));
    render(<Dashboard />);
    expect(screen.getByText('Caricamento dashboard...')).toBeInTheDocument();
  });

  it('renders dashboard with stats and charts after data load', async () => {
    api.getDashboardStats.mockResolvedValue(mockStats);
    render(<Dashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Caricamento dashboard...')).not.toBeInTheDocument();
    });

    // Check Header
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Check KPI Cards values
    expect(screen.getByText('55')).toBeInTheDocument(); // 50 adults + 5 children
    expect(screen.getByText(/di cui 5 bambini/i)).toBeInTheDocument();
    
    // Check Financials
    // toLocaleString() might vary by locale, but let's check basic presence of numbers
    // Using regex loosely for currency formatting "8.000" or "8,000"
    expect(screen.getByText(/€ 15[.,]000/)).toBeInTheDocument();
    expect(screen.getByText(/€ 8[.,]000/)).toBeInTheDocument();

    // Check Pending count (20 + 2)
    expect(screen.getByText('22')).toBeInTheDocument();

    // Check Charts existence (mocked)
    expect(screen.getByText('Stato Ospiti')).toBeInTheDocument();
    expect(screen.getByText('Pie Chart Mock')).toBeInTheDocument();

    // Check Logistics
    expect(screen.getByText('Alloggio Confermato')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument(); // Accommodation total

    expect(screen.getByText('Transfer Confermato')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // Transfer total
  });

  it('handles API error gracefully', async () => {
    api.getDashboardStats.mockRejectedValue(new Error('Network Error'));
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Caricamento dashboard...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Impossibile caricare le statistiche.')).toBeInTheDocument();
  });
});
