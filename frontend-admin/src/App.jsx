// frontend-admin/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import InvitationList from './pages/InvitationList';
import Dashboard from './pages/Dashboard';
import Configuration from './pages/Configuration';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/invitations" element={<InvitationList />} />
          <Route path="/settings" element={<Configuration />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
