import { performRedirect } from './utils/redirect';
import { debugLog, debugWarn } from './utils/debug';

// FAST PATH: Check for redirect BEFORE loading React
// This avoids loading the entire React app just to redirect
const hasQuery = new URLSearchParams(window.location.search).has('q');

debugLog('app:bootstrap', {
  origin: window.location.origin,
  href: window.location.href,
  hasQuery,
  hasServiceWorkerController: Boolean(navigator.serviceWorker?.controller),
});

if (hasQuery) {
  // Redirect path - minimal JS, no React needed
  performRedirect().then((redirected) => {
    if (!redirected) {
      // Redirect failed, load the full app
      debugWarn('app:redirect-fallback', {
        reason: 'performRedirect returned false',
      });
      loadApp();
    }
    // If redirected, the page will navigate away, no need to load React
  });
} else {
  // No query - load the full app for the homepage
  debugLog('app:homepage-mode');
  loadApp();
}

/**
 * Load the full React application
 * Only called when we're NOT redirecting
 */
async function loadApp() {
  debugLog('app:load-ui:start');

  // Dynamic imports - only load these when showing the UI
  const [
    { default: React },
    { default: ReactDOM },
    { default: App },
    { inject },
    { injectSpeedInsights },
    { registerSW }
  ] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('./App'),
    import('@vercel/analytics'),
    import('@vercel/speed-insights'),
    import('virtual:pwa-register')
  ]);

  // Load CSS only when showing UI
  await import('./tailwind.css');
  debugLog('app:load-ui:assets-ready');

  // Initialize analytics (only on homepage, not redirects)
  inject();
  injectSpeedInsights();

  // Register PWA
  const updateSW = registerSW({
    onNeedRefresh() {
      debugWarn('pwa:update-available');
      if (confirm("New content available, reload?")) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      debugLog('pwa:offline-ready');
    },
  });

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  debugLog('app:load-ui:rendered');
}


