//import EnvelopePlayground from './components/invitation/EnvelopePlayground';
import './App.css';
import ErrorModal from './components/common/ErrorModal';
import LanguageSwitcher from './components/common/LanguageSwitcher';
import { TextProvider } from './contexts/TextContext';
import useApiErrorModal from './hooks/useApiErrorModal';
import './i18n'; // Inizializza i18n
import InvitationPage from './pages/InvitationPage';

function App() {
  const { error, clearError } = useApiErrorModal();

  return (
    <TextProvider>
      <div className="app">
        <LanguageSwitcher />
        <ErrorModal error={error} onClose={clearError} />
        {/* <EnvelopePlayground /> */}
        <InvitationPage />
      </div>
    </TextProvider>
  );
}

export default App;
