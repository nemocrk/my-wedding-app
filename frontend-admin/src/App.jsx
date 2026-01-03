import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InvitationList from './pages/InvitationList';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorModal from './components/common/ErrorModal';
import useApiErrorModal from './hooks/useApiErrorModal';
import './App.css';

function App() {
  const { error, clearError, isOpen } = useApiErrorModal();

  return (
    <Router>
      <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
        <ErrorModal 
          isOpen={isOpen} 
          onClose={clearError} 
          errorDetails={error?.message || error?.detail || error} 
        />
        
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="invitations" element={<InvitationList />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
