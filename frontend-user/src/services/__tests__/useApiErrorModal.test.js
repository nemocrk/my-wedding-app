import { renderHook, act } from '@testing-library/react';
import useApiErrorModal from '../../hooks/useApiErrorModal';
import { expect, test, describe } from 'vitest';

describe('useApiErrorModal Hook', () => {
  test('initial state', () => {
    const { result } = renderHook(() => useApiErrorModal());

    expect(result.current.error).toBeNull();
    expect(result.current.isOpen).toBe(false);
  });

  test('handleApiError sets error state', () => {
    const { result } = renderHook(() => useApiErrorModal());
    const testError = { message: 'Test Error', status: 500 };

    act(() => {
      window.dispatchEvent(new CustomEvent('api-error', { detail: testError }));
    });

    expect(result.current.error).toEqual(testError);
    expect(result.current.isOpen).toBe(true);
  });

  test('handleApiError uses fallback if detail is null', () => {
    const { result } = renderHook(() => useApiErrorModal());

    act(() => {
      window.dispatchEvent(new CustomEvent('api-error', { detail: null }));
    });

    expect(result.current.error).toEqual({ message: 'Errore sconosciuto' });
  });

  test('clearError resets state', () => {
    const { result } = renderHook(() => useApiErrorModal());

    act(() => {
      window.dispatchEvent(new CustomEvent('api-error', { detail: { message: 'E' } }));
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
