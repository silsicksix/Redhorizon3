
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GlobalProvider } from './store/GlobalStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <GlobalProvider>
        <App />
      </GlobalProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Register Service Worker for PWA Standalone & Offline Support
if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('RedHorizon PWA ServiceWorker active:', registration.scope);
    }).catch((err) => {
      console.debug('ServiceWorker registration ignored:', err);
    });
  });
}

