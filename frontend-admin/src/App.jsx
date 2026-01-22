import { Navigate, Route, HashRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import ErrorModal from './components/common/ErrorModal';
import Layout from './components/layout/Layout';
import { ConfirmDialogProvider } from './contexts/ConfirmDialogContext';
import { ToastProvider } from './contexts/ToastContext';
import useApiErrorModal from './hooks/useApiErrorModal';
import AccommodationsPage from './pages/AccommodationsPage';
import Configuration from './pages/Configuration';
import Dashboard from './pages/Dashboard';
import InvitationList from './pages/InvitationList';
import LabelManager from './pages/LabelManager';
import WhatsAppConfig from './pages/WhatsAppConfig';

function App() {
  const { error, clearError, isOpen } = useApiErrorModal();

  return (
    <ConfirmDialogProvider>
      <ToastProvider>
        <Router>
          <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
            <ErrorModal
              isOpen={isOpen}
              onClose={clearError}
              errorDetails={error?.message || error?.detail || error}
            />

            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="invitations" element={<InvitationList />} />
                <Route path="accommodations" element={<AccommodationsPage />} />
                <Route path="labels" element={<LabelManager />} />
                <Route path="config" element={<Configuration />} />
                <Route path="whatsapp" element={<WhatsAppConfig />} />
              </Route>
            </Routes>
          </div>
        </Router>
      </ToastProvider>
    </ConfirmDialogProvider>
  );
}

export default App;