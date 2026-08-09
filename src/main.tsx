import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import DebugRouter from './ui/debug/DebugRouter.tsx';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

const root = createRoot(document.getElementById('root')!);

// Dev-only debug screens. `import.meta.env.DEV` is replaced with `false` at
// build time, so this branch — and DebugRouter with it — is eliminated from
// production bundles. The dev server's SPA history fallback is what serves
// index.html for /debug/* in the first place; a production build has no such
// fallback, which is a second reason these pages never ship.
if (import.meta.env.DEV && window.location.pathname.startsWith('/debug/')) {
  root.render(
    <StrictMode>
      <DebugRouter pathname={window.location.pathname} />
    </StrictMode>,
  );
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
