import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with automatic cache update
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Applet updated, refreshing cache');
  },
  onOfflineReady() {
    console.log('Applet ready for offline use');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
