import React from 'react';
import InvitationPage from './pages/InvitationPage';
import ErrorModal from './components/ErrorModal';
import useApiErrorModal from './hooks/useApiErrorModal';
import './App.css';

function App() {
  const { error, clearError } = useApiErrorModal();

  return (
    <div className="app">
      <ErrorModal error={error} onClose={clearError} />
      <InvitationPage />
    </div>
  );
}

export default App;
