import React from 'react';
//import EnvelopePlayground from './components/invitation/EnvelopePlayground';
import InvitationPage from './pages/InvitationPage';
import ErrorModal from './components/common/ErrorModal';
import LanguageSwitcher from './components/LanguageSwitcher';
import useApiErrorModal from './hooks/useApiErrorModal';
import './App.css';

function App() {
  const { error, clearError } = useApiErrorModal();

  return (
    <div className="app">
      <LanguageSwitcher />
      <ErrorModal error={error} onClose={clearError} />
      {/* <EnvelopePlayground /> */}
      <InvitationPage />
    </div>
  );
}

export default App;
