import React from 'react';
import './ErrorScreen.css';

const ErrorScreen = ({ message }) => {
  return (
    <div className="error-screen">
      <h1>⚠️</h1>
      <p>{message}</p>
    </div>
  );
};

export default ErrorScreen;
