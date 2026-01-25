import { renderHook, act } from '@testing-library/react';
import useApiErrorModal from '../../hooks/useApiErrorModal';

describe('useApiErrorModal Hook', () => {
  test('initial state', () => {
    const { result } = renderHook(() => useApiErrorModal());

    expect(result.current.error).toBeNull(); // FIX: property is 'error', not 'apiError'
    expect(result.current.isOpen).toBe(false); // FIX: property is 'isOpen', not 'isErrorOpen'
  });

  test('handleApiError (simulated via event) sets error state', () => {
    const { result } = renderHook(() => useApiErrorModal());
    const testError = { message: 'Test Error', status: 500 };

    act(() => {
      // Logic relies on window event
      window.dispatchEvent(new CustomEvent('api-error', { detail: testError }));
    });

    expect(result.current.error).toEqual(testError);
    expect(result.current.isOpen).toBe(true);
  });

  test('clearError resets state', () => {
    const { result } = renderHook(() => useApiErrorModal());

    // First open it
    act(() => {
      window.dispatchEvent(new CustomEvent('api-error', { detail: { message: 'E' } }));
    });
    expect(result.current.isOpen).toBe(true);

    // Then close
    act(() => {
      result.current.clearError(); // FIX: method is 'clearError'
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
