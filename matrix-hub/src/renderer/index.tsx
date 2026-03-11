import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/matrix-hub.css';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
