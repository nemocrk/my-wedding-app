import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import toast from 'react-hot-toast';
import { ToastProvider, useToast } from './ToastContext';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  CheckCircle: () => <div data-testid="icon-success" />,
  XCircle: () => <div data-testid="icon-error" />,
  AlertCircle: () => <div data-testid="icon-warning" />,
  Info: () => <div data-testid="icon-info" />,
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', async () => {
  const actual = await vi.importActual('react-hot-toast');
  return {
    ...actual,
    default: {
      custom: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      loading: vi.fn(),
      promise: vi.fn(),
      dismiss: vi.fn(),
    },
    Toaster: () => <div data-testid="toaster" />,
  };
});

// Test Component using the hook
const TestComponent = () => {
  const toastMethods = useToast();
  return (
    <div>
      <button onClick={() => toastMethods.success('Success!')}>Success</button>
      <button onClick={() => toastMethods.error('Error!')}>Error</button>
      <button onClick={() => toastMethods.warning('Warning!')}>Warning</button>
      <button onClick={() => toastMethods.info('Info!')}>Info</button>
      <button onClick={() => toastMethods.show('Custom!', 'info')}>Custom</button>
      <button onClick={() => toastMethods.loading('Loading...')}>Loading</button>
      <button onClick={() => toastMethods.dismiss('123')}>Dismiss</button>
    </div>
  );
};

describe('ToastContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ToastProvider API', () => {
    it('should provide all toast methods', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );
      
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should call toast.custom with correct type for success()', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );
      
      screen.getByText('Success').click();
      
      expect(toast.custom).toHaveBeenCalled();
      const callArgs = toast.custom.mock.calls[0];
      // Render the passed component to verify props
      const RenderedToast = callArgs[0];
      const { container } = render(RenderedToast({}));
      expect(container.querySelector('[class*="bg-green-500"]')).toBeInTheDocument(); // Progress bar color
    });

    it('should call toast.custom with correct type for error()', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );
      
      screen.getByText('Error').click();
      
      const callArgs = toast.custom.mock.calls[0];
      const RenderedToast = callArgs[0];
      const { container } = render(RenderedToast({}));
      expect(container.querySelector('[class*="bg-red-500"]')).toBeInTheDocument();
    });

    it('should call toast.custom with correct type for warning()', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );
      
      screen.getByText('Warning').click();
      
      const callArgs = toast.custom.mock.calls[0];
      const RenderedToast = callArgs[0];
      const { container } = render(RenderedToast({}));
      expect(container.querySelector('[class*="bg-yellow-500"]')).toBeInTheDocument();
    });

    it('should call toast.custom with correct type for info()', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );
      
      screen.getByText('Info').click();
      
      const callArgs = toast.custom.mock.calls[0];
      const RenderedToast = callArgs[0];
      const { container } = render(RenderedToast({}));
      expect(container.querySelector('[class*="bg-blue-500"]')).toBeInTheDocument();
    });

    it('should handle custom duration', () => {
      const TestDuration = () => {
        const { success } = useToast();
        return <button onClick={() => success('Msg', 5000)}>Click</button>;
      };

      render(
        <ToastProvider>
          <TestDuration />
        </ToastProvider>
      );

      screen.getByText('Click').click();
      expect(toast.custom).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ duration: 5000 })
      );
    });
  });

  describe('Advanced Features', () => {
    it('should expose toast.loading', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );
      
      screen.getByText('Loading').click();
      expect(toast.loading).toHaveBeenCalledWith('Loading...', expect.any(Object));
    });

    it('should expose toast.dismiss', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );
      
      screen.getByText('Dismiss').click();
      expect(toast.dismiss).toHaveBeenCalledWith('123');
    });

    it('should expose toast.promise', async () => {
      const TestPromise = () => {
        const { promise } = useToast();
        const run = () => promise(
          Promise.resolve(),
          { loading: 'L', success: 'S', error: 'E' }
        );
        return <button onClick={run}>Run</button>;
      };

      render(
        <ToastProvider>
          <TestPromise />
        </ToastProvider>
      );
      
      screen.getByText('Run').click();
      expect(toast.promise).toHaveBeenCalledWith(
        expect.any(Promise),
        { loading: 'L', success: 'S', error: 'E' }
      );
    });
  });

  describe('CustomToast Component Rendering', () => {
    // Helper to render the CustomToast component directly
    const renderToast = (type, message) => {
      let ToastComponent;
      
      // We capture the component function passed to toast.custom
      const captureRender = (renderer) => {
        ToastComponent = renderer;
      };
      toast.custom.mockImplementation(captureRender);

      const TestRender = () => {
        const methods = useToast();
        React.useEffect(() => {
          methods[type](message);
        }, []);
        return null;
      };

      render(
        <ToastProvider>
          <TestRender />
        </ToastProvider>
      );

      return render(ToastComponent({}));
    };

    it('should render success icon and message', () => {
      const { getByText, getByTestId } = renderToast('success', 'Great job!');
      expect(getByText('Great job!')).toBeInTheDocument();
      expect(getByTestId('icon-success')).toBeInTheDocument();
    });

    it('should render error icon and message', () => {
      const { getByText, getByTestId } = renderToast('error', 'Failed!');
      expect(getByText('Failed!')).toBeInTheDocument();
      expect(getByTestId('icon-error')).toBeInTheDocument();
    });

    it('should render warning icon and message', () => {
      const { getByText, getByTestId } = renderToast('warning', 'Be careful!');
      expect(getByText('Be careful!')).toBeInTheDocument();
      expect(getByTestId('icon-warning')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should throw error if used outside provider', () => {
      // Suppress console.error for this test as React logs the error
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => render(<TestComponent />)).toThrow('useToast must be used within a ToastProvider');

      console.error = originalError;
    });
  });
});
