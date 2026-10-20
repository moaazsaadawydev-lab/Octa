export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  viewportMode: ViewportMode;
  reloadKey: number;
  faviconUrl?: string;
}

export interface BrowserHistoryItem {
  url: string;
  title?: string;
  port?: string;
  visitCount: number;
  lastVisitedAt: number;
}

export const VIEWPORT_CONFIG: Record<ViewportMode, { label: string; width: string; icon: string }> = {
  desktop: { label: 'Desktop (100%)', width: '100%', icon: 'monitor' },
  tablet: { label: 'Tablet (768px)', width: '768px', icon: 'tablet' },
  mobile: { label: 'Mobile (375px)', width: '375px', icon: 'smartphone' },
};

export const DEFAULT_DEV_PORTS = ['3000', '5173', '8000', '8080', '4200'];

export const DEFAULT_BROWSER_URL = 'http://localhost:5173';

export function extractPortOrHost(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return parsed.port ? `:${parsed.port}` : parsed.hostname;
  } catch {
    const match = rawUrl.match(/:(\d+)/);
    return match ? `:${match[1]}` : 'localhost';
  }
}

export function extractPortNumber(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `http://${rawUrl}`);
    return parsed.port || null;
  } catch {
    const match = rawUrl.match(/:(\d+)/);
    return match ? match[1] : null;
  }
}

export function formatLocalhostUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_BROWSER_URL;

  // Port only: "3000" or ":3000"
  if (/^:?\d+$/.test(trimmed)) {
    const port = trimmed.replace(':', '');
    return `http://localhost:${port}`;
  }

  // Host without protocol: "localhost:3000" or "127.0.0.1:8000"
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/i.test(trimmed)) {
    return `http://${trimmed}`;
  }

  // Standard full URL
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
}
