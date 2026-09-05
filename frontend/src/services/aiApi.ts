export interface GeminiTestResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface AISettingsConfig {
  gemini_api_key: string;
  gemini_selected_model: string;
}

/**
 * Executes a minimal handshake ping against the Gemini API via the backend Go service.
 */
export async function testGeminiConnection(
  apiKey: string,
  model: string = 'gemini-2.5-flash'
): Promise<GeminiTestResult> {
  try {
    const w = window as any;
    if (typeof w?.go?.main?.App?.TestGeminiConnection === 'function') {
      const res = await w.go.main.App.TestGeminiConnection(apiKey, model);
      if (typeof res === 'object' && res !== null) {
        return {
          success: Boolean(res.success),
          message: res.message || (res.success ? 'Connected (Handshake Successful)' : 'Connection failed'),
        };
      }
      if (typeof res === 'boolean') {
        return {
          success: res,
          message: res ? 'Connected (Handshake Successful)' : 'Connection failed',
        };
      }
      if (Array.isArray(res)) {
        return {
          success: Boolean(res[0]),
          message: res[1] || (res[0] ? 'Connected (Handshake Successful)' : 'Connection failed'),
        };
      }
    }
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn('[AI testGeminiConnection Error]:', errMsg);
    return {
      success: false,
      message: errMsg || 'Connection failed: Backend service error',
      error: errMsg,
    };
  }

  // Fallback for non-wails dev environment: basic format validation
  if (!apiKey || apiKey.trim().length < 10) {
    return {
      success: false,
      message: 'Invalid API Key format (Dev Mock)',
    };
  }
  return {
    success: true,
    message: 'Connected (Handshake Successful - Dev Mock)',
  };
}

/**
 * Persists Gemini AI configuration to the backend store.
 */
export async function saveAISettings(
  apiKey: string,
  model: string = 'gemini-2.5-flash'
): Promise<boolean> {
  try {
    const w = window as any;
    if (typeof w?.go?.main?.App?.SaveAISettings === 'function') {
      const ok = await w.go.main.App.SaveAISettings(apiKey, model);
      return Boolean(ok);
    }
  } catch (err) {
    console.warn('[AI saveAISettings Error]:', err);
    return false;
  }
  return true;
}

/**
 * Retrieves persisted Gemini AI configuration from the backend store.
 */
export async function getAISettings(): Promise<AISettingsConfig> {
  try {
    const w = window as any;
    if (typeof w?.go?.main?.App?.GetAISettings === 'function') {
      const cfg = await w.go.main.App.GetAISettings();
      return {
        gemini_api_key: cfg?.gemini_api_key || '',
        gemini_selected_model: cfg?.gemini_selected_model || 'gemini-2.5-flash',
      };
    }
  } catch (err) {
    console.warn('[AI getAISettings Error]:', err);
  }
  return {
    gemini_api_key: '',
    gemini_selected_model: 'gemini-2.5-flash',
  };
}

/**
 * Analyzes repository diff and generates a conventional commit message via Gemini.
 */
export async function generateCommitMessage(
  repoPath: string
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const w = window as any;
    if (typeof w?.go?.main?.App?.GenerateCommitMessage === 'function') {
      const msg = await w.go.main.App.GenerateCommitMessage(repoPath);
      return {
        success: true,
        message: String(msg).trim(),
      };
    }
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn('[AI generateCommitMessage Error]:', errMsg);
    return {
      success: false,
      message: errMsg,
      error: errMsg,
    };
  }

  // Dev fallback mock if Wails runtime not available
  return {
    success: true,
    message: 'feat(git): add commit message generator via AI (Dev Mock)',
  };
}

