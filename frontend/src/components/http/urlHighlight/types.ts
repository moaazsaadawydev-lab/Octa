import React from 'react';

export interface VariableToken {
  type: 'text' | 'variable';
  text: string;
  rawKey?: string;
  resolved?: boolean;
  value?: string;
  source?: 'environment' | 'global' | 'macro';
  scope?: string;
  isSecret?: boolean;
  startIndex?: number;
}

export const SHARED_TYPOGRAPHY_STYLE: React.CSSProperties = {
  fontFamily: "JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, 'Courier New', monospace",
  fontSize: '12.5px',
  lineHeight: '20px',
  letterSpacing: '0px',
  fontWeight: 500,
  boxSizing: 'border-box',
  whiteSpace: 'pre',
};
