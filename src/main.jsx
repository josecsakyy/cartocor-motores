import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { MotorsProvider } from './store/MotorsProvider';
import { MotorDialogsProvider } from './store/MotorDialogsProvider';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <MotorsProvider>
          <MotorDialogsProvider>
            <App />
          </MotorDialogsProvider>
        </MotorsProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
