import { ITheme } from '@xterm/xterm';

export const mapCursorStyle = (style?: string): 'block' | 'bar' | 'underline' => {
  if (!style) return 'block';
  const s = style.toLowerCase();
  if (s === 'bar' || s === 'line') return 'bar';
  if (s === 'underline') return 'underline';
  return 'block';
};

export const DARK_THEME: ITheme = {
  background: '#090a0f',
  foreground: '#f4f4f5',
  cursor: '#38bdf8',
  cursorAccent: '#090a0f',
  selectionBackground: 'rgba(255, 255, 255, 0.2)',
  selectionForeground: '#ffffff',
  black: '#18181b',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#facc15',
  blue: '#60a5fa',
  magenta: '#c084fc',
  cyan: '#22d3ee',
  white: '#f4f4f5',
  brightBlack: '#71717a',
  brightRed: '#ef4444',
  brightGreen: '#22c55e',
  brightYellow: '#eab308',
  brightBlue: '#3b82f6',
  brightMagenta: '#a855f7',
  brightCyan: '#06b6d4',
  brightWhite: '#ffffff',
};

export const LIGHT_THEME: ITheme = {
  background: '#f8fafc',
  foreground: '#0f172a',
  cursor: '#0284c7',
  cursorAccent: '#f8fafc',
  selectionBackground: 'rgba(0, 0, 0, 0.15)',
  selectionForeground: '#0f172a',
  black: '#0f172a',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#ca8a04',
  blue: '#2563eb',
  magenta: '#9333ea',
  cyan: '#0891b2',
  white: '#64748b',
  brightBlack: '#475569',
  brightRed: '#b91c1c',
  brightGreen: '#15803d',
  brightYellow: '#a16207',
  brightBlue: '#1d4ed8',
  brightMagenta: '#7e22ce',
  brightCyan: '#0e7490',
  brightWhite: '#0f172a',
};
