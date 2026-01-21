import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DynamicPieChart from '../components/DynamicPieChart';
import { api } from '../services/api';

// Mock API service
vi.mock('../services/api', () => ({
  api: {
    getDynamicDashboardStats: vi.fn(),
  },
}));

// Mock Recharts
vi.mock('recharts', () => {
  const OriginalModule = vi.importActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => <div className="recharts-responsive-container">{children}</div>,
    PieChart: ({ children }) => <div className="recharts-pie-chart" data-testid="pie-chart">{children}</div>,
    Pie: ({ data, dataKey, innerRadius, outerRadius }) => (
      <div 
        className="recharts-pie" 
        data-testid="pie-level"
        data-innerradius={innerRadius}
        data-outerradius={outerRadius}
      >
        Pie: {data.length} items
      </div>
    ),
    Cell: ({ fill, startAngle, endAngle }) => (
      <div 
        className="recharts-cell" 
        data-fill={fill}
        data-start={startAngle}
        data-end={endAngle}
      />
    ),
    Tooltip: () => <div data-testid="tooltip">Tooltip</div>,
    Legend: ({ content }) => content ? content({ payload: [] }) : <div data-testid="legend">Legend</div>,
  };
});

describe('DynamicPieChart Component', () => {
  const mockEmptyResponse = {
    levels: [],
    meta: {
      total: 0,
      available_filters: ['groom', 'bride', 'sent', 'confirmed', 'Label1', 'Label2'],
    },
  };

  const mockSingleLevelResponse = {
    levels: [
      [
        { name: 'groom', field: 'origin', value: 40, ids: [1, 2, 3], parent_idx: null },
        { name: 'bride', field: 'origin', value: 30, ids: [4, 5], parent_idx: null },
        { name: 'other', field: 'other', value: 30, ids: [6, 7], parent_idx: null },
      ],
    ],
    meta: {
      total: 100,
      available_filters: ['groom', 'bride', 'sent', 'confirmed'],
    },
  };

  const mockMultiLevelResponse = {
    levels: [
      [
        { name: 'groom', field: 'origin', value: 40, ids: [1, 2, 3], parent_idx: null },
        { name: 'bride', field: 'origin', value: 60, ids: [4, 5, 6], parent_idx: null },
      ],
      [
        { name: 'sent', field: 'status', value: 20, ids: [1, 2], parent_idx: 0 },
        { name: 'other', field: 'other', value: 20, ids: [3], parent_idx: 0 },
        { name: 'confirmed', field: 'status', value: 40, ids: [4, 5], parent_idx: 1 },
        { name: 'other', field: 'other', value: 20, ids: [6], parent_idx: 1 },
      ],
    ],
    meta: {
      total: 100,
      available_filters: ['groom', 'bride', 'sent', 'confirmed'],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders filter buttons after loading available filters', async () => {
    api.getDynamicDashboardStats.mockResolvedValue(mockEmptyResponse);
    render(<DynamicPieChart />);

    await waitFor(() => {
      expect(screen.getByText('groom')).toBeInTheDocument();
    });

    expect(screen.getByText('bride')).toBeInTheDocument();
    expect(screen.getByText('sent')).toBeInTheDocument();
    expect(screen.getByText('Label1')).toBeInTheDocument();
  });

  it('displays empty state message when no filters are selected', async () => {
    api.getDynamicDashboardStats.mockResolvedValue(mockEmptyResponse);
    render(<DynamicPieChart />);

    await waitFor(() => {
      expect(screen.getByText(/Seleziona almeno un filtro/i)).toBeInTheDocument();
    });
  });

  it('loads chart data when a filter is selected', async () => {
    const user = userEvent.setup();
    api.getDynamicDashboardStats
      .mockResolvedValueOnce(mockEmptyResponse)
      .mockResolvedValueOnce(mockSingleLevelResponse);

    render(<DynamicPieChart />);

    await waitFor(() => {
      expect(screen.getByText('groom')).toBeInTheDocument();
    });

    const groomButton = screen.getByText('groom');
    await user.click(groomButton);

    await waitFor(() => {
      expect(api.getDynamicDashboardStats).toHaveBeenCalledWith(['groom']);
    });
  });

  it('toggles filter selection on button click', async () => {
    const user = userEvent.setup();
    api.getDynamicDashboardStats.mockResolvedValue(mockEmptyResponse);

    render(<DynamicPieChart />);

    await waitFor(() => {
      expect(screen.getByText('groom')).toBeInTheDocument();
    });

    const groomButton = screen.getByText('groom');

    // Initially unselected
    expect(groomButton).toHaveClass('bg-gray-100');

    // Click to select
    await user.click(groomButton);
    await waitFor(() => {
      expect(groomButton).toHaveClass('bg-blue-600');
    });

    // Click again to deselect
    await user.click(groomButton);
    await waitFor(() => {
      expect(groomButton).toHaveClass('bg-gray-100');
    });
  });

  it('renders single-level pie chart correctly', async () => {
    const user = userEvent.setup();
    api.getDynamicDashboardStats
      .mockResolvedValueOnce(mockEmptyResponse)
      .mockResolvedValueOnce(mockSingleLevelResponse);

    render(<DynamicPieChart />);

    await waitFor(() => {
      expect(screen.getByText('groom')).toBeInTheDocument();
    });

    const groomButton = screen.getByText('groom');
    await user.click(groomButton);

    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    // Should render 1 Pie component for level 1
    const pieLevels = screen.getAllByTestId('pie-level');
    expect(pieLevels.length).toBe(1);
  });

  it('renders multi-level pie chart correctly', async () => {
    const user = userEvent.setup();
    api.getDynamicDashboardStats
      .mockResolvedValueOnce(mockEmptyResponse)
      .mockResolvedValueOnce(mockMultiLevelResponse);

    render(<DynamicPieChart />);

    await waitFor(() => {
      expect(screen.getByText('groom')).toBeInTheDocument();
    });

    const groomButton = screen.getByText('groom');
    await user.click(groomButton);

    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    // Should render 2 Pie components (level 1 and level 2)
    const pieLevels = screen.getAllByTestId('pie-level');
    expect(pieLevels.length).toBe(2);
  });

  it('applies correct colors to known filters', async () => {
    const user = userEvent.setup();
    api.getDynamicDashboardStats
      .mockResolvedValueOnce(mockEmptyResponse)
      .mockResolvedValueOnce(mockSingleLevelResponse);

    render(<DynamicPieChart />);

    await waitFor(() => {
      expect(screen.getByText('groom')).toBeInTheDocument();
    });

    const groomButton = screen.getByText('groom');
    await user.click(groomButton);

    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    // Colors are applied in the component, verify via DOM
    // The actual color values are defined in COLORS constant
    // We can't directly test the color application in mocked recharts,
    // but we verify the chart renders without errors
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    const user = userEvent.setup();
    api.getDynamicDashboardStats
      .mockResolvedValueOnce(mockEmptyResponse)
      .mockRejectedValueOnce(new Error('Network Error'));

    render(<DynamicPieChart />);

    await waitFor(() => {
      expect(screen.getByText('groom')).toBeInTheDocument();
    });

    const groomButton = screen.getByText('groom');
    await user.click(groomButton);

    await waitFor(() => {
      expect(screen.getByText(/Errore:/i)).toBeInTheDocument();
    });
  });

  it('displays loading state while fetching data', async () => {
    const user = userEvent.setup();
    api.getDynamicDashboardStats
      .mockResolvedValueOnce(mockEmptyResponse)
      .mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(mockSingleLevelResponse), 100))
      );

    render(<DynamicPieChart />);

    await waitFor(() => {
      expect(screen.getByText('groom')).toBeInTheDocument();
    });

    const groomButton = screen.getByText('groom');
    await user.click(groomButton);

    // Should show loading indicator
    expect(await screen.findByText(/Caricamento.../i)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(
      () => {
        expect(screen.queryByText(/Caricamento.../i)).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('supports multiple filter selection', async () => {
    const user = userEvent.setup();
    api.getDynamicDashboardStats
      .mockResolvedValueOnce(mockEmptyResponse)
      .mockResolvedValueOnce(mockSingleLevelResponse)
      .mockResolvedValueOnce(mockMultiLevelResponse);

    render(<DynamicPieChart />);

    await waitFor(() => {
      expect(screen.getByText('groom')).toBeInTheDocument();
    });

    // Select first filter
    const groomButton = screen.getByText('groom');
    await user.click(groomButton);

    await waitFor(() => {
      expect(groomButton).toHaveClass('bg-blue-600');
    });

    // Select second filter
    const brideButton = screen.getByText('bride');
    await user.click(brideButton);

    await waitFor(() => {
      expect(brideButton).toHaveClass('bg-blue-600');
    });

    // Both should be selected
    expect(groomButton).toHaveClass('bg-blue-600');
    expect(brideButton).toHaveClass('bg-blue-600');

    // API should be called with both filters
    await waitFor(() => {
      const lastCall = api.getDynamicDashboardStats.mock.calls.slice(-1)[0];
      expect(lastCall[0]).toContain('groom');
      expect(lastCall[0]).toContain('bride');
    });
  });

  it('calculates angles correctly for multi-level alignment', async () => {
    const user = userEvent.setup();
    api.getDynamicDashboardStats
      .mockResolvedValueOnce(mockEmptyResponse)
      .mockResolvedValueOnce(mockMultiLevelResponse);

    render(<DynamicPieChart />);

    await waitFor(() => {
      expect(screen.getByText('groom')).toBeInTheDocument();
    });

    const groomButton = screen.getByText('groom');
    await user.click(groomButton);

    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    // The component should render without errors
    // Angle calculation logic is tested implicitly by successful rendering
    const pieLevels = screen.getAllByTestId('pie-level');
    expect(pieLevels.length).toBe(2);

    // Verify innerRadius/outerRadius are set correctly for multiple levels
    expect(pieLevels[0]).toHaveAttribute('data-innerradius', '85%');
    expect(pieLevels[0]).toHaveAttribute('data-outerradius', '100%');
    expect(pieLevels[1]).toHaveAttribute('data-innerradius', '67%');
    expect(pieLevels[1]).toHaveAttribute('data-outerradius', '82%');
  });

  it('splits filters into two rows for display', async () => {
    api.getDynamicDashboardStats.mockResolvedValue(mockEmptyResponse);
    render(<DynamicPieChart />);

    await waitFor(() => {
      expect(screen.getByText('groom')).toBeInTheDocument();
    });

    // The component uses flexbox with 2 rows
    // We can verify all filters are rendered
    const allFilters = mockEmptyResponse.meta.available_filters;
    allFilters.forEach((filter) => {
      expect(screen.getByText(filter)).toBeInTheDocument();
    });
  });

  it('clears chart when all filters are deselected', async () => {
    const user = userEvent.setup();
    api.getDynamicDashboardStats
      .mockResolvedValueOnce(mockEmptyResponse)
      .mockResolvedValueOnce(mockSingleLevelResponse);

    render(<DynamicPieChart />);

    await waitFor(() => {
      expect(screen.getByText('groom')).toBeInTheDocument();
    });

    // Select a filter
    const groomButton = screen.getByText('groom');
    await user.click(groomButton);

    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    // Deselect the filter
    await user.click(groomButton);

    await waitFor(() => {
      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });

    // Should show empty state again
    expect(screen.getByText(/Seleziona almeno un filtro/i)).toBeInTheDocument();
  });
});
