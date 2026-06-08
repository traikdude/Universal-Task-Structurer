import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import './index.css';

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ GLOBAL ERROR BOUNDARY — GAS HTML Service Debugging
//
// Inside the Google Apps Script HTML Service iframe, Chrome DevTools may not
// be accessible (sandboxed cross-origin iframe). These handlers create a
// visible DOM overlay for ANY uncaught error or rejected promise so the user
// can see what went wrong without needing DevTools.
// ─────────────────────────────────────────────────────────────────────────────

const ERROR_OVERLAY_ID = '__gas-error-overlay__';

/**
 * Creates or appends to a fixed-position error overlay visible in the viewport.
 * Designed to be readable even if CSS fails to load.
 */
function showErrorOverlay(title: string, detail: string): void {
  let overlay = document.getElementById(ERROR_OVERLAY_ID);

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = ERROR_OVERLAY_ID;
    overlay.style.cssText = [
      'position:fixed',
      'bottom:0',
      'left:0',
      'right:0',
      'max-height:50vh',
      'overflow-y:auto',
      'background:#1a0000',
      'color:#ff6b6b',
      'font-family:monospace',
      'font-size:12px',
      'padding:16px',
      'z-index:2147483647',
      'border-top:3px solid #ff4444',
      'box-shadow:0 -4px 20px rgba(0,0,0,0.5)',
    ].join(';');
    document.body.appendChild(overlay);

    // Add a dismiss button
    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = '✕ Dismiss';
    dismissBtn.style.cssText = [
      'position:absolute',
      'top:8px',
      'right:12px',
      'background:#ff4444',
      'color:white',
      'border:none',
      'padding:4px 12px',
      'border-radius:4px',
      'cursor:pointer',
      'font-size:11px',
      'font-family:sans-serif',
    ].join(';');
    dismissBtn.onclick = () => overlay?.remove();
    overlay.appendChild(dismissBtn);

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'font-size:14px;font-weight:bold;margin-bottom:8px;color:#ff8888;';
    header.textContent = '🚨 UTS Error Boundary (GAS Debug Mode)';
    overlay.appendChild(header);
  }

  // Append the error entry
  const entry = document.createElement('div');
  entry.style.cssText = 'margin-top:8px;padding:8px;background:rgba(255,255,255,0.05);border-radius:4px;border-left:3px solid #ff4444;';
  entry.innerHTML = `<strong style="color:#ffaaaa;">${escapeHtml(title)}</strong><br/><span style="color:#ff9999;opacity:0.85;">${escapeHtml(detail)}</span><br/><span style="color:#666;font-size:10px;">${new Date().toISOString()}</span>`;
  overlay.appendChild(entry);
}

/** Minimal HTML escaping to prevent XSS in error messages */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Install global handlers BEFORE React mounts ──────────────────────────────

window.onerror = (message, source, lineno, colno, error) => {
  const title = `Uncaught Error: ${String(message)}`;
  const detail = [
    error?.stack ?? '',
    source ? `Source: ${source}:${lineno}:${colno}` : '',
  ].filter(Boolean).join('\n');

  console.error('[GAS Error Boundary]', title, detail);
  showErrorOverlay(title, detail);

  // Return false to let the error propagate to any other handlers
  return false;
};

window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  const reason = event.reason;
  const title = 'Unhandled Promise Rejection';
  const detail = reason instanceof Error
    ? `${reason.message}\n${reason.stack ?? ''}`
    : String(reason);

  console.error('[GAS Error Boundary]', title, detail);
  showErrorOverlay(title, detail);
};

// ── Mount React with try-catch fallback ──────────────────────────────────────

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com';

try {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error(
      'Root element #root not found in DOM. ' +
      'Ensure index.html contains <div id="root"></div>.'
    );
  }

  createRoot(rootElement).render(
    <StrictMode>
      <GoogleOAuthProvider clientId={clientId}>
        <App />
      </GoogleOAuthProvider>
    </StrictMode>,
  );
} catch (mountError: any) {
  // If React itself fails to mount (module resolution, syntax errors, etc.),
  // show a visible fallback instead of a blank white screen.
  const title = 'React Mount Failure';
  const detail = mountError instanceof Error
    ? `${mountError.message}\n${mountError.stack ?? ''}`
    : String(mountError);

  console.error('[GAS Error Boundary] React failed to mount:', mountError);
  showErrorOverlay(title, detail);

  // Also inject a minimal fallback UI into #root if it exists
  const fallbackRoot = document.getElementById('root');
  if (fallbackRoot) {
    fallbackRoot.innerHTML = `
      <div style="padding:32px;text-align:center;font-family:system-ui,sans-serif;">
        <h1 style="color:#dc2626;font-size:20px;">⚠️ Application Failed to Load</h1>
        <p style="color:#666;margin-top:8px;font-size:14px;">
          Check the error overlay at the bottom of the screen for details.
        </p>
        <p style="color:#999;margin-top:16px;font-size:12px;">
          If you're inside Google Apps Script, try reloading the web app.
        </p>
      </div>
    `;
  }
}