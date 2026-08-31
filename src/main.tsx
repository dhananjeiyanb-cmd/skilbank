// Safe localStorage wrapper to prevent QuotaExceededError crashes
try {
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key: string, value: string) {
    try {
      originalSetItem.call(this, key, value);
    } catch (error) {
      console.error(`[LocalStorage Safe Wrapper] setItem failed for key "${key}":`, error);
    }
  };
} catch (e) {
  console.error('[LocalStorage Safe Wrapper] Failed to override Storage.prototype.setItem:', e);
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFirestoreDurableQueue } from './lib/firestoreSync';

// Resume any cloud-sync writes that were queued locally in a previous session
// and flush them automatically as soon as Firestore accepts writes again.
initFirestoreDurableQueue();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
