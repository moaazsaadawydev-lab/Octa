import { HttpResponseState } from '../types';

// Helper to detect response language and format response value for Monaco Viewer
export const getResponseEditorConfig = (responseState: HttpResponseState | null) => {
  if (!responseState || responseState.data === undefined || responseState.data === null) {
    return { language: 'plaintext', value: '' };
  }

  const headers = responseState.headers || {};
  let contentType = '';
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === 'content-type') {
      contentType = String(headers[k]).toLowerCase();
      break;
    }
  }

  let language = 'plaintext';
  let value = '';

  if (typeof responseState.data === 'object' && responseState.data !== null) {
    language = 'json';
    try {
      value = JSON.stringify(responseState.data, null, 2);
    } catch {
      value = String(responseState.data);
    }
  } else if (typeof responseState.data === 'string') {
    const trimmed = responseState.data.trim();
    if (
      contentType.includes('application/json') ||
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      language = 'json';
      try {
        const parsed = JSON.parse(trimmed);
        value = JSON.stringify(parsed, null, 2);
      } catch {
        value = responseState.data;
      }
    } else if (
      contentType.includes('text/html') ||
      trimmed.startsWith('<!DOCTYPE html') ||
      trimmed.startsWith('<html')
    ) {
      language = 'html';
      value = responseState.data;
    } else if (
      contentType.includes('application/xml') ||
      contentType.includes('text/xml') ||
      trimmed.startsWith('<?xml') ||
      (trimmed.startsWith('<') && trimmed.endsWith('>'))
    ) {
      language = 'xml';
      value = responseState.data;
    } else {
      language = 'plaintext';
      value = responseState.data;
    }
  } else {
    value = String(responseState.data ?? '');
  }

  return { language, value };
};
