import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/safe-area.css';

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registrado com sucesso:', registration.scope);
      })
      .catch((error) => {
        console.log('Erro ao registrar Service Worker:', error);
      });
  });
}

// Inicializar Capacitor para mobile
const initializeCapacitor = async () => {
  try {
    // Importar Capacitor dinamicamente (só funciona no mobile)
    const { Capacitor } = await import('@capacitor/core');
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const { SplashScreen } = await import('@capacitor/splash-screen');
    const { Keyboard } = await import('@capacitor/keyboard');
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');

    if (Capacitor.isNativePlatform()) {
      console.log('Executando em plataforma nativa:', Capacitor.getPlatform());

      // Configurar StatusBar
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#1a1a2e' });
      } catch (e) {
        console.log('StatusBar não disponível');
      }

      // Esconder SplashScreen
      try {
        await SplashScreen.hide();
      } catch (e) {
        console.log('SplashScreen não disponível');
      }

      // Configurar Keyboard
      try {
        Keyboard.addListener('keyboardWillShow', () => {
          document.body.classList.add('keyboard-open');
        });
        Keyboard.addListener('keyboardWillHide', () => {
          document.body.classList.remove('keyboard-open');
        });
      } catch (e) {
        console.log('Keyboard não disponível');
      }

      // Adicionar feedback háptico em botões
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('[role="button"]')) {
          Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        }
      });
    }
  } catch (e) {
    // Capacitor não disponível (web)
    console.log('Modo web');
  }
};

// Inicializar
initializeCapacitor();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
