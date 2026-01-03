import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import InvitationsPage from './pages/InvitationsPage';
import ConfigPage from './pages/ConfigPage';
import AccommodationsPage from './pages/AccommodationsPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-64 max-w-[calc(100%-16rem)]">
          <main className="p-8">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/invitations" element={<InvitationsPage />} />
              <Route path="/accommodations" element={<AccommodationsPage />} />
              <Route path="/config" element={<ConfigPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
