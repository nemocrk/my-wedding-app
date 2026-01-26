import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../__tests__/setup.jsx';
import * as api from '../../services/api';
import InvitationPage from '../InvitationPage';

// Mock dependencies
vi.mock('../../services/api', () => ({
  authenticateInvitation: vi.fn(),
}));

vi.mock('../../components/invitation/EnvelopeAnimation', () => ({
  default: ({ onComplete }) => (
    <div data-testid="envelope-anim">
      Envelope Animation
      <button onClick={onComplete}>Complete</button>
    </div>
  ),
}));

vi.mock('../../components/invitation/LetterContent', () => ({
  default: () => <div data-testid="letter-content">Letter Content</div>,
}));

vi.mock('../../components/common/LoadingScreen', () => ({
  default: () => <div data-testid="loading">Loading...</div>,
}));

// Spy on window dispatch
const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

describe('InvitationPage', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    dispatchEventSpy.mockClear();

    // Reset location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '', pathname: '/', href: 'http://localhost/' }
    });

    // Mock History
    window.history.replaceState = vi.fn();
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('shows loading initially then error if params missing', async () => {
    window.location.search = ''; // No code/token

    render(<InvitationPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    // Check dispatch event
    await waitFor(() => {
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    });
    const evt = dispatchEventSpy.mock.calls.find(c => c[0].type === 'api-error')[0];
    expect(evt.detail.message).toMatch(/Link non valido. Mancano i parametri di autenticazione./i); // translation key fallback or text
  });

  it('authenticates successfully and shows envelope', async () => {
    window.location.search = '?code=ABC&token=123';
    api.authenticateInvitation.mockResolvedValue({ valid: true, invitation: { id: 1, name: 'Test' } });

    render(<InvitationPage />);

    await waitFor(() => {
      expect(api.authenticateInvitation).toHaveBeenCalledWith('ABC', '123');
      expect(screen.getByTestId('envelope-anim')).toBeInTheDocument();
    });

    // Params stripped
    expect(window.history.replaceState).toHaveBeenCalled();
  });

  it('handles invalid token error', async () => {
    window.location.search = '?code=ABC&token=BAD';
    api.authenticateInvitation.mockResolvedValue({ valid: false, message: 'Invalid Token' });

    render(<InvitationPage />);

    await waitFor(() => {
      // expect(screen.getByText('Invalid Token')).toBeInTheDocument(); // Handled by Modal via event
    });

    expect(dispatchEventSpy).toHaveBeenCalled();
    const evt = dispatchEventSpy.mock.calls.find(c => c[0].type === 'api-error')[0];
    expect(evt.detail.message).toBe('Invalid Token');
  });

  it('handles network error during auth', async () => {
    window.location.search = '?code=ABC&token=123';
    api.authenticateInvitation.mockRejectedValue(new Error('Network Fail'));

    render(<InvitationPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    expect(dispatchEventSpy).toHaveBeenCalled();
    const evt = dispatchEventSpy.mock.calls.find(c => c[0].type === 'api-error')[0];
    expect(evt.detail.message).toBe('Network Fail');
  });

  it('does not re-authenticate if data already present (effect dependency check)', async () => {
    // This is hard to test directly without checking internal state or mocking useState
    // But we can check api calls count if we could rerender.
    // However, the component unmounts on param change usually.
    // Let's rely on the logic: useEffect checks `if (invitationData) return`

    window.location.search = '?code=ABC&token=123';
    api.authenticateInvitation.mockResolvedValue({ valid: true, invitation: { id: 1 } });

    const { rerender } = render(<InvitationPage />);

    await waitFor(() => screen.getByTestId('envelope-anim'));

    // Force rerender (simulating language change which updates 't' prop/hook)
    rerender(<InvitationPage />);

    // Should still be 1 call
    expect(api.authenticateInvitation).toHaveBeenCalledTimes(1);
  });
});
