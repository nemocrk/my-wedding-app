import React from 'react';
import { ThemeProvider, BaseStyles, Box } from '@primer/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import InvitationsPage from './pages/InvitationsPage';
import ConfigPage from './pages/ConfigPage';
import AccommodationsPage from './pages/AccommodationsPage'; // IMPORT
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <BaseStyles>
        <Router>
          <Box display="flex" minHeight="100vh" bg="canvas.default">
            <Sidebar />
            <Box flexGrow={1} display="flex" flexDirection="column" maxWidth="100%">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/invitations" element={<InvitationsPage />} />
                <Route path="/accommodations" element={<AccommodationsPage />} /> {/* ROUTE */}
                <Route path="/config" element={<ConfigPage />} />
              </Routes>
            </Box>
          </Box>
        </Router>
      </BaseStyles>
    </ThemeProvider>
  );
}

export default App;
