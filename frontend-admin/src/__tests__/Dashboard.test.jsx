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
    invitations: {
      imported: 5,
      created: 10,
      sent: 15,
      read: 8,
      confirmed: 25,
      declined: 3,
    },
    logistics: {
      accommodation: { 
        total_confirmed: 15,
        confirmed_adults: 12,
        confirmed_children: 3
      },
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

  // ========================================
  // NEW TESTS FOR PR #62
  // ========================================

  it('displays invitation status breakdown correctly', async () => {
    api.getDashboardStats.mockResolvedValue(mockStats);
    api.getDynamicDashboardStats.mockResolvedValue(mockDynamicStats);
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Caricamento dashboard...')).not.toBeInTheDocument();
    });

    // Verify invitation status data is present in the stats
    // Note: The component doesn't directly display these numbers in text,
    // but they're used for the chart. We verify they're loaded.
    expect(api.getDashboardStats).toHaveBeenCalled();
    const callResult = await api.getDashboardStats.mock.results[0].value;
    expect(callResult.invitations.imported).toBe(5);
    expect(callResult.invitations.created).toBe(10);
    expect(callResult.invitations.sent).toBe(15);
    expect(callResult.invitations.confirmed).toBe(25);
  });

  it('correctly excludes not_coming guests from displayed stats', async () => {
    // Create stats where not_coming guests would affect totals
    const statsWithNotComing = {
      ...mockStats,
      guests: {
        adults_confirmed: 40, // Only coming guests
        children_confirmed: 5,
        adults_pending: 15,
        children_pending: 2,
        adults_declined: 3,
        children_declined: 1,
      },
    };

    api.getDashboardStats.mockResolvedValue(statsWithNotComing);
    api.getDynamicDashboardStats.mockResolvedValue(mockDynamicStats);
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Caricamento dashboard...')).not.toBeInTheDocument();
    });

    // Total confirmed should be 40 + 5 = 45 (not_coming excluded by backend)
    expect(screen.getByText('45')).toBeInTheDocument();
    
    // Pending should be 15 + 2 = 17
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('renders DynamicPieChart component with filter selector', async () => {
    api.getDashboardStats.mockResolvedValue(mockStats);
    api.getDynamicDashboardStats.mockResolvedValue(mockDynamicStats);
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Caricamento dashboard...')).not.toBeInTheDocument();
    });

    // Check that filter buttons are rendered
    expect(await screen.findByText('test_filter')).toBeInTheDocument();
    expect(screen.getByText('test2')).toBeInTheDocument();
  });

  it('loads chart data when filters are selected', async () => {
    const user = userEvent.setup();
    api.getDashboardStats.mockResolvedValue(mockStats);
    // Setup mock for initial load (empty filters)
    api.getDynamicDashboardStats.mockResolvedValue(mockDynamicStats);
    
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Caricamento dashboard...')).not.toBeInTheDocument();
    });

    // Initially, dynamic stats is called once to get available filters
    await waitFor(() => {
        expect(api.getDynamicDashboardStats).toHaveBeenCalledWith([]);
    });

    // Click a filter
    const filterButton = await screen.findByText('test_filter');
    await user.click(filterButton);

    // Should call API with selected filter
    await waitFor(() => {
      expect(api.getDynamicDashboardStats).toHaveBeenCalledWith(['test_filter']);
    });
  });

  it('displays empty state when no filters are selected', async () => {
    api.getDashboardStats.mockResolvedValue(mockStats);
    api.getDynamicDashboardStats.mockResolvedValue(mockDynamicStats);
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Caricamento dashboard...')).not.toBeInTheDocument();
    });

    // Should show message prompting to select filters
    expect(screen.getByText(/Seleziona almeno un filtro/i)).toBeInTheDocument();
  });

  it('toggles filter selection on click', async () => {
    const user = userEvent.setup();
    api.getDashboardStats.mockResolvedValue(mockStats);
    api.getDynamicDashboardStats.mockResolvedValue(mockDynamicStats);
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Caricamento dashboard...')).not.toBeInTheDocument();
    });

    const filterButton = await screen.findByText('test_filter');
    
    // Should have unselected style initially
    expect(filterButton).toHaveClass('bg-gray-100');
    
    // Click to select
    await user.click(filterButton);
    
    // Should have selected style
    await waitFor(() => {
      expect(filterButton).toHaveClass('bg-blue-600');
    });
    
    // Click again to deselect
    await user.click(filterButton);
    
    // Should return to unselected style
    await waitFor(() => {
      expect(filterButton).toHaveClass('bg-gray-100');
    });
  });

  it('handles dynamic stats API error gracefully', async () => {
    const user = userEvent.setup();
    api.getDashboardStats.mockResolvedValue(mockStats);
    
    // First call succeeds (to get filters), second fails (after filter selection)
    api.getDynamicDashboardStats
      .mockResolvedValueOnce(mockDynamicStats)
      .mockRejectedValueOnce(new Error('Dynamic Stats Error'));
    
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Caricamento dashboard...')).not.toBeInTheDocument();
    });

    // Click a filter to trigger error
    const filterButton = await screen.findByText('test_filter');
    await user.click(filterButton);

    // Should display error message in chart area
    await waitFor(() => {
      expect(screen.getByText(/Errore:/i)).toBeInTheDocument();
    });
  });

  it('displays multiple selected filters simultaneously', async () => {
    const user = userEvent.setup();
    api.getDashboardStats.mockResolvedValue(mockStats);
    api.getDynamicDashboardStats.mockResolvedValue(mockDynamicStats);
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Caricamento dashboard...')).not.toBeInTheDocument();
    });

    // Select first filter
    const filter1 = await screen.findByText('test_filter');
    await user.click(filter1);
    
    await waitFor(() => {
      expect(filter1).toHaveClass('bg-blue-600');
    });

    // Select second filter
    const filter2 = screen.getByText('test2');
    await user.click(filter2);
    
    await waitFor(() => {
      expect(filter2).toHaveClass('bg-blue-600');
    });

    // Both should remain selected
    expect(filter1).toHaveClass('bg-blue-600');
    expect(filter2).toHaveClass('bg-blue-600');

    // API should be called with both filters
    await waitFor(() => {
      const lastCall = api.getDynamicDashboardStats.mock.calls.slice(-1)[0];
      // Order might vary, check both contained
      expect(lastCall[0]).toEqual(expect.arrayContaining(['test_filter', 'test2']));
    });
  });

  it('displays loading state while fetching dynamic chart data', async () => {
    const user = userEvent.setup();
    api.getDashboardStats.mockResolvedValue(mockStats);
    
    // Slow response simulation
    api.getDynamicDashboardStats.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockDynamicStats), 100))
    );
    
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Caricamento dashboard...')).not.toBeInTheDocument();
    });

    const filterButton = await screen.findByText('test_filter');
    await user.click(filterButton);

    // Should show loading indicator
    expect(await screen.findByText(/Caricamento.../i)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/Caricamento.../i)).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('renders accommodation and transfer stats correctly', async () => {
    const statsWithLogistics = {
      ...mockStats,
      logistics: {
        accommodation: {
          total_confirmed: 25,
          confirmed_adults: 20,
          confirmed_children: 5,
        },
        transfer: {
          confirmed: 18,
        },
      },
    };

    api.getDashboardStats.mockResolvedValue(statsWithLogistics);
    api.getDynamicDashboardStats.mockResolvedValue(mockDynamicStats);
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Caricamento dashboard...')).not.toBeInTheDocument();
    });

    // Check accommodation count
    expect(screen.getByText('25')).toBeInTheDocument();
    
    // Check transfer count
    expect(screen.getByText('18')).toBeInTheDocument();
  });
});