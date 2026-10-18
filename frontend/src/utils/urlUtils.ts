let lastOpenedUrl = '';
let lastOpenedTime = 0;

/**
 * Opens a URL in the user's default OS browser using Wails runtime BrowserOpenURL,
 * with a fallback to window.open in standard browser environments.
 */
export function openExternalUrl(rawUrl: string): void {
  if (!rawUrl) return;
  let url = rawUrl.trim();
  if (!url) return;

  if (url.startsWith('www.')) {
    url = 'https://' + url;
  }

  // Deduplicate rapid opens (within 800ms)
  const now = Date.now();
  if (url === lastOpenedUrl && now - lastOpenedTime < 800) {
    return;
  }
  lastOpenedUrl = url;
  lastOpenedTime = now;

  try {
    const w = window as any;
    if (w.runtime && typeof w.runtime.BrowserOpenURL === 'function') {
      w.runtime.BrowserOpenURL(url);
      return;
    }
  } catch (err) {
    console.warn('[openExternalUrl] Wails BrowserOpenURL error:', err);
  }

  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (err) {
    console.error('[openExternalUrl] window.open error:', err);
  }
}
