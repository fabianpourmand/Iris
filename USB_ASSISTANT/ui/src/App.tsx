import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components';
import { SetupPage, ChatPage, SettingsPage, DesignPreviewPage, SystemTestPage, OnboardingPage, LibraryPage, GuidesPage, ExplorerPage } from './pages';
import { useSettings } from './hooks';
import { themes } from './theme/themes';
import { I18nProvider } from './i18n';

function SystemEntry() {
  const completed = (() => {
    try {
      return localStorage.getItem('iris.systemTestCompleted') === 'true';
    } catch {
      return false;
    }
  })();

  return completed ? <Navigate to="/chat" replace /> : <SystemTestPage />;
}

function App() {
  const { settings } = useSettings();

  useEffect(() => {
    const root = document.documentElement;

    // Apply dark mode class
    if (settings.dark_mode) {
      root.classList.add('iris-dark');
    } else {
      root.classList.remove('iris-dark');
    }

    // Apply survival mode class
    if (settings.survival_mode) {
      root.classList.add('iris-survival');
    } else {
      root.classList.remove('iris-survival');
    }

    // Apply theme variables
    const theme = themes.heritage;
    Object.entries(theme).forEach(([key, value]) => {
      const cssKey = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssKey, value);
    });
  }, [settings.dark_mode, settings.survival_mode]);

  return (
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SystemEntry />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/design-preview" element={<DesignPreviewPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<Layout />}>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/explorer" element={<ExplorerPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/guides" element={<GuidesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  );
}

export default App;
