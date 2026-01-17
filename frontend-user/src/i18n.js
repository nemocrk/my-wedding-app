import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    fallbackLng: 'it',
    lng: localStorage.getItem('language') || 'it',
    backend: {
      loadPath: '/i18n/{{lng}}.json',
    },
    interpolation: {
      escapeValue: false // React già protegge da XSS
    },
    react: {
      useSuspense: false // Evita problemi con Suspense in dev mode
    }
  });

export default i18n;
