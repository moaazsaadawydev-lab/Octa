/**
 * Utility to format raw Google Gemini and AI engine errors into human-friendly messages.
 * Prevents raw JSON dumps in UI toasts or dialogs.
 */
export function formatAIErrorMessage(rawError: string | unknown): string {
  if (!rawError) return 'Unknown AI error';
  const errText =
    typeof rawError === 'string'
      ? rawError
      : (rawError as any)?.message || String(rawError);

  // 1. Check if rawError contains an embedded JSON error payload
  const jsonMatch = errText.match(/\{[\s\S]*"error"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed?.error) {
        const msg = String(parsed.error.message || '');
        const code = parsed.error.code;
        const status = parsed.error.status;

        // Quota / Rate Limit (429)
        if (
          code === 429 ||
          status === 'RESOURCE_EXHAUSTED' ||
          msg.toLowerCase().includes('quota')
        ) {
          const retryMatch = msg.match(/retry in\s+([^\n\r.]+)/i);
          const retryNotice = retryMatch
            ? ` (Please retry in ${retryMatch[1].trim()})`
            : '';
          return `Gemini Quota Exceeded (429): You have reached the request limit for this model on your current plan${retryNotice}. Please switch to another model (e.g. Gemini 3.5 Flash) in Settings -> AI Engine, or try again later.`;
        }

        // Authentication / Bad Key (400, 401, 403)
        if (
          code === 401 ||
          code === 403 ||
          msg.toLowerCase().includes('api key') ||
          msg.toLowerCase().includes('permission')
        ) {
          return 'Authentication Failed: Invalid or unauthorized Gemini API key. Please verify your credentials in Settings -> AI Engine.';
        }

        // Model not found (404)
        if (code === 404 || status === 'NOT_FOUND') {
          return 'Selected AI model is not available for your Gemini account. Try selecting Gemini 3.5 Flash in Settings -> AI Engine.';
        }

        // Clean out linebreaks and raw URLs
        const firstLine = msg
          .split('\n')[0]
          .replace(/https?:\/\/\S+/g, '')
          .trim();
        if (firstLine) {
          return `Gemini API Error (${code || status || '400'}): ${firstLine}`;
        }
      }
    } catch {
      // JSON parse failed; fall through to pattern matching
    }
  }

  // 2. Pattern Matching on Plain Error String
  const lower = errText.toLowerCase();

  if (
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota exceeded')
  ) {
    const retryMatch = errText.match(/retry in\s+([^\n\r.]+)/i);
    const retryNotice = retryMatch
      ? ` (Please retry in ${retryMatch[1].trim()})`
      : '';
    return `Gemini Quota Exceeded (429): Request limit reached for this model${retryNotice}. Please switch to Gemini 3.5 Flash in Settings -> AI Engine.`;
  }

  if (
    lower.includes('403') ||
    lower.includes('api key not configured') ||
    lower.includes('invalid api key')
  ) {
    return 'Authentication Failed: Invalid Gemini API key. Please check your credentials in Settings -> AI Engine.';
  }

  if (lower.includes('404') || lower.includes('not found')) {
    return 'Selected AI model was not found. Please choose a supported model in Settings -> AI Engine.';
  }

  if (lower.includes('timeout') || lower.includes('deadline exceeded')) {
    return 'Network Timeout: Gemini API did not respond in time. Please check your internet connection.';
  }

  // Strip prefixes like "AI request failed: " or "Gemini error: "
  let clean = errText
    .replace(/^AI request failed:\s*/i, '')
    .replace(/^Gemini error:\s*/i, '')
    .trim();

  // Strip any remaining raw JSON brackets if visible
  if (clean.startsWith('{') && clean.endsWith('}')) {
    clean = 'Gemini service returned an unhandled error response.';
  }

  return clean;
}
