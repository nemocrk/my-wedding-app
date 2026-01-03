import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import InvitationList from './pages/InvitationList';
import Configuration from './pages/Configuration';
import AccommodationsPage from './pages/AccommodationsPage';
import ErrorModal from './components/common/ErrorModal'; // Correct path
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
    <Router>
      <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
        <ErrorModal error={error} onClose={() => setError(null)} />
        <Sidebar />
        <div className="flex-1 flex flex-col ml-64 max-w-[calc(100%-16rem)]">
          <main className="p-8">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/invitations" element={<InvitationList />} />
              <Route path="/accommodations" element={<AccommodationsPage />} />
              <Route path="/config" element={<Configuration />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
