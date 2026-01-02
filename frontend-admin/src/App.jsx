// frontend-admin/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import InvitationList from './pages/InvitationList';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/invitations" replace />} />
          <Route path="/invitations" element={<InvitationList />} />
          {/* Placeholder per altre route */}
          <Route path="/settings" element={<div>Pagina Impostazioni (WIP)</div>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
