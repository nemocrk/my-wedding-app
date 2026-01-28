import { render, RenderOptions } from '@testing-library/react';
import React, { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ConfirmDialogProvider } from '../contexts/ConfirmDialogContext';
import { ToastProvider } from '../contexts/ToastContext';

/**
 * Custom render function che wrappa il componente con tutti i provider necessari.
 * Usa questo al posto di render() di RTL per testare componenti che usano:
 * - useToast() hook
 * - useConfirm() hook
 * - react-router hooks (useNavigate, useLocation, etc.)
 * - i18next (già mockato in setupTests.tsx)
 */
interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <MemoryRouter>
      <ToastProvider>
        <ConfirmDialogProvider>
          {children}
        </ConfirmDialogProvider>
      </ToastProvider>
    </MemoryRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export tutto da RTL
export * from '@testing-library/react';

// Override del render con la versione custom
export { customRender as render };

// Ensure tests can import `act` reliably from the shared utils.
// React Testing Library may not re-export the correct `act` in all setups,
// so explicitly export the one from react-dom which is compatible with jsdom.
// Prefer React's act when available (React 18+); some environments warn if
// ReactDOMTestUtils.act is used. Export act from react so tests import
// the recommended implementation.
export { act } from 'react';

