import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '../pages/Dashboard';
import { api } from '../services/api';

// Mock API service
vi.mock('../services/api', () => ({
  api: {
    getDashboardStats: vi.fn(),
    getDynamicDashboardStats: vi.fn(),
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

  const mockDynamicStats = {
    "levels": [
      [
        {
          "name": "test1",
          "field": "test",
          "value": 4,
          "parent_idx": null
        },
        {
          "name": "test2",
          "field": "test",
          "value": 1,
          "parent_idx": null
        }
      ]
    ],
    "meta": {
      "total": 5,
      "available_filters": [
        "test_filter",
        "test2",
      ]
    }
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    api.getDashboardStats.mockReturnValue(new Promise(() => { }));
    render(<Dashboard />);
    expect(screen.getByText('Caricamento dati...')).toBeInTheDocument();
  });

  it('renders dashboard with stats and charts after data load', async () => {
    const user = userEvent.setup();

    api.getDashboardStats.mockResolvedValue(mockStats);
    api.getDynamicDashboardStats.mockResolvedValue(mockDynamicStats);
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Caricamento dashboard...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Seleziona almeno un filtro/i)).toBeInTheDocument();
    const testFilterButton = await screen.findByText('test_filter');
    await user.click(testFilterButton);

    // Check KPI Cards values
    expect(screen.getByText('55')).toBeInTheDocument();
    expect(screen.getByText(/di cui 5 bambini/i)).toBeInTheDocument();

    // Check Financials
    // "confirmed" amount appears twice: in KPI card and in Financial Details list
    const confirmedPrices = screen.getAllByText(/€ 8[.,]000/);
    expect(confirmedPrices.length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText(/€ 15[.,]000/)).toBeInTheDocument();

    // Check Pending count
    expect(screen.getByText('22')).toBeInTheDocument();

    // Check Charts existence
    expect(screen.getByText('Logistica e Costi')).toBeInTheDocument();
    expect(screen.getByText('Pie Chart Mock')).toBeInTheDocument();

    // Check Logistics
    // The text on the UI card is "Alloggi" and "Transfer", NOT "Alloggio Confermato"
    const alloggiTexts = screen.getAllByText(/Alloggi/i);
    expect(alloggiTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('15')).toBeInTheDocument();

    const transferTexts = screen.getAllByText(/Navetta/i);
    expect(transferTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    api.getDashboardStats.mockRejectedValue(new Error('Network Error'));
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Caricamento dashboard...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Errore nel caricamento dei dati')).toBeInTheDocument();
  });
});
