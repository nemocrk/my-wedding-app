import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import useApiErrorModal from '../hooks/useApiErrorModal';

describe('useApiErrorModal Hook', () => {
  test('initial state', () => {
    const { result } = renderHook(() => useApiErrorModal());
    
    expect(result.current.apiError).toBeNull();
    expect(result.current.isErrorOpen).toBe(false);
  });

  test('handleApiError sets error state', () => {
    const { result } = renderHook(() => useApiErrorModal());
    const testError = { message: 'Test Error', status: 500 };

    act(() => {
      result.current.handleApiError(testError);
    });

    expect(result.current.apiError).toEqual(testError);
    expect(result.current.isErrorOpen).toBe(true);
  });

  test('handleApiError handles generic error object', () => {
    const { result } = renderHook(() => useApiErrorModal());
    const genericError = new Error('Network Error');

    act(() => {
      result.current.handleApiError(genericError);
    });

    // Check if it wrapped it or used it directly
    expect(result.current.apiError).toBeTruthy();
    expect(result.current.isErrorOpen).toBe(true);
  });

  test('closeErrorModal resets state', () => {
    const { result } = renderHook(() => useApiErrorModal());

    // First open it
    act(() => {
      result.current.handleApiError({ message: 'E' });
    });
    expect(result.current.isErrorOpen).toBe(true);

    // Then close
    act(() => {
      result.current.closeErrorModal();
    });

    expect(result.current.isErrorOpen).toBe(false);
    expect(result.current.apiError).toBeNull();
  });
});
