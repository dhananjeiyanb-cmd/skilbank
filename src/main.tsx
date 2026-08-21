import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFirestoreDurableQueue } from './lib/firestoreSync';

// Resume any cloud-sync writes queued locally in a previous session and flush
// them automatically as soon as Firestore accepts writes again.
initFirestoreDurableQueue();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
