import React from 'react';
import { useTranslation } from 'react-i18next';
import './LoadingScreen.css';

const LoadingScreen = () => {
  const { t } = useTranslation();
  return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>{t('user.common.loading_invite')}</p>
    </div>
  );
};

export default LoadingScreen;
