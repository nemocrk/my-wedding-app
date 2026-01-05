import React from 'react';
import EnvelopePlayground from './components/invitation/EnvelopePlayground';
// import InvitationPage from './pages/InvitationPage';
import ErrorModal from './components/common/ErrorModal';
import useApiErrorModal from './hooks/useApiErrorModal';
import './App.css';

function App() {
  const { error, clearError } = useApiErrorModal();

  return (
    <div className="app">
      <ErrorModal error={error} onClose={clearError} />
      <EnvelopePlayground />
    </div>
  );
}

export default App;
