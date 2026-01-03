import React, { useState, useEffect } from 'react';
import InvitationPage from './pages/InvitationPage';
import ErrorModal from './components/ErrorModal';
import './App.css';

function App() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (event) => {
      console.log("Global Error Caught:", event.detail);
      setError(event.detail);
    };

    window.addEventListener('api-error', handleError);

    return () => {
      window.removeEventListener('api-error', handleError);
    };
  }, []);

  return (
    <div className="app">
      <ErrorModal error={error} onClose={() => setError(null)} />
      <InvitationPage />
    </div>
  );
}

export default App;
