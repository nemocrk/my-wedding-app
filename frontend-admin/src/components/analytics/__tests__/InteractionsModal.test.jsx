import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InteractionsModal from '../InteractionsModal';
import { api } from '../../../services/api';

// Mock API
vi.mock('../../../services/api', () => ({
  api: {
    getInvitationInteractions: vi.fn(),
    generateInvitationLink: vi.fn(),
  },
}));

// Mock Canvas getContext
const mockGetContext = vi.fn(() => ({
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
}));

// Mock window.HTMLCanvasElement
beforeEach(() => {
  vi.clearAllMocks();
  // Setup HTMLCanvasElement mock for jsdom environment if needed, 
  // though Vitest with jsdom usually handles basic canvas existence, getContext needs mock.
  HTMLCanvasElement.prototype.getContext = mockGetContext;
});

describe('InteractionsModal (Heatmap) Component', () => {
  const mockProps = {
    invitationId: '123',
    invitationName: 'Mario Rossi',
    onClose: vi.fn(),
  };

  const mockSessions = [
    {
      session_id: 'sess1',
      start_time: '2023-10-27T10:00:00Z',
      device_info: 'Desktop Chrome',
      events: [
        { type: 'page_view', timestamp: '2023-10-27T10:00:00Z' }
      ],
      heatmap: {
        screen_width: 1000,
        screen_height: 800,
        mouse_data: [
          { x: 10, y: 10, t: 1698393600000 },
          { x: 100, y: 100, t: 1698393610000 }
        ]
      }
    }
  ];

  it('renders correctly and loads data', async () => {
    api.getInvitationInteractions.mockResolvedValue(mockSessions);
    api.generateInvitationLink.mockResolvedValue({ url: 'http://test.com' });

    render(<InteractionsModal {...mockProps} />);

    // Check Header
    expect(screen.getByText(/Analisi Interazioni: Mario Rossi/i)).toBeInTheDocument();

    // Wait for loading to finish and session list to appear
    await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument(); // Loader usually has role status or simply check text
        expect(screen.getByText('Desktop Chrome')).toBeInTheDocument();
    });

    // Check Replay section presence
    expect(screen.getByText(/Replay Sessione/i)).toBeInTheDocument();
  });

  it('selects session and renders canvas', async () => {
    api.getInvitationInteractions.mockResolvedValue(mockSessions);
    api.generateInvitationLink.mockResolvedValue({ url: 'http://test.com' });

    render(<InteractionsModal {...mockProps} />);

    await waitFor(() => {
        expect(screen.getByText('Desktop Chrome')).toBeInTheDocument();
    });

    // Click the session to select it
    fireEvent.click(screen.getByText('Desktop Chrome'));

    // Verify Canvas is in the document (by class or logic)
    // In our component, canvas renders only if selectedSession?.heatmap is true.
    // We expect the canvas to be present now.
    // Note: 'canvas' role might not be implicit, so we search by tag or class if needed, or simply container presence.
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('width', '1000');
  });

  it('handles playback controls', async () => {
    api.getInvitationInteractions.mockResolvedValue(mockSessions);
    api.generateInvitationLink.mockResolvedValue({ url: 'http://test.com' });

    render(<InteractionsModal {...mockProps} />);

    await waitFor(() => {
        expect(screen.getByText('Desktop Chrome')).toBeInTheDocument();
    });
    
    // Play button should be present
    const playBtn = document.querySelector('button[title="Riavvia"]').nextElementSibling; // The Play/Pause button is after "SkipBack"
    // Better selector approach:
    // We can look for the play icon or based on component structure. 
    // Since we use Lucide icons, they render SVGs. 
    // Let's rely on finding the button that toggles play state.
    
    expect(playBtn).toBeInTheDocument();
    fireEvent.click(playBtn);
    
    // After clicking play, state changes. 
    // Since we mocked requestAnimationFrame implicitly or rely on jsdom, 
    // we just check if it didn't crash and potentially check state if we could access it.
    // For now, simple interaction test is enough for "render & basic logic".
  });
});
