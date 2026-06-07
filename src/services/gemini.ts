import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { SYSTEM_PROMPT } from '../constants/systemPrompt';

// ── Configuration ────────────────────────────────────────────────────────────

// Model fallback chain: try the best available, degrade gracefully.
const MODEL_CHAIN = [
  'gemini-3.5-flash',
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite',
];

// ── Custom Error Class ───────────────────────────────────────────────────────

export class GeminiApiError extends Error {
  public readonly status?: number;
  public readonly model?: string;
  public readonly details?: string;

  constructor(message: string, opts?: { status?: number; model?: string; details?: string }) {
    super(message);
    this.name = 'GeminiApiError';
    this.status = opts?.status;
    this.model = opts?.model;
    this.details = opts?.details;
  }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY ?? (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);
  if (!key) {
    throw new GeminiApiError(
      'No Gemini API key found. Please set VITE_GEMINI_API_KEY in your .env.local file.',
      { status: 401 }
    );
  }
  return key;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Streams a Gemini response with automatic model fallback.
 * Uses VITE_GEMINI_API_KEY from .env.local — no external gateway required.
 */
export async function processTaskStream(
  input: string,
  imageBase64: string | undefined,
  imageMimeType: string | undefined,
  onChunk: (text: string) => void
): Promise<string> {
  // ── Inject today's date ──────────────────────────────────────────────────
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });
  const systemInstruction = SYSTEM_PROMPT.replace(/\{\{CURRENT_DATE\}\}/g, currentDate);

  // ── Build content parts ──────────────────────────────────────────────────
  const parts: any[] = [];

  if (imageBase64 && imageMimeType) {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    parts.push({ inlineData: { data: base64Data, mimeType: imageMimeType } });
  }

  parts.push({
    text: `###Apply the aforementioned framework text to the following:\n\n${
      input || 'Extract tasks from the provided image.'
    }`
  });

  // ── Check if we are running in the Google Apps Script context ────────────
  // GAS HTML Service does not support Server-Sent Events or streaming.
  // The server-side queryGemini() returns the complete response in one shot.
  // IMPORTANT: In GAS, the Gemini API must go through the server-side proxy
  // because the GAS iframe sandbox blocks direct browser-to-API calls (CORS).
  if (typeof window !== 'undefined' && (window as any).google?.script?.run) {
    const contents = [{ role: 'user', parts }];
    try {
      const gasResult = await new Promise<string>((resolve, reject) => {
        (window as any).google.script.run
          .withSuccessHandler((response: { text?: string; error?: string }) => {
            if (response && response.error) {
              reject(new GeminiApiError(response.error));
            } else {
              const text = response?.text || '';
              onChunk(text);
              resolve(text);
            }
          })
          .withFailureHandler((err: any) => {
            reject(new GeminiApiError(err?.message || 'GAS server proxy failed.'));
          })
          .queryGemini(MODEL_CHAIN[0], contents, systemInstruction);
      });
      return gasResult;
    } catch (gasError: any) {
      const msg = gasError?.message || '';
      // If the error is a permission/auth issue, give clear instructions
      if (msg.includes('permission') || msg.includes('UrlFetchApp') || msg.includes('authorization')) {
        throw new GeminiApiError(
          'Server authorization required. Please open the Apps Script Editor, select "forceAuth" from the function dropdown, click Run, and accept the OAuth consent dialog. Then reload this page.',
          { status: 403 }
        );
      }
      // For other GAS errors, rethrow with context
      throw new GeminiApiError(
        `GAS server proxy error: ${msg}. If this persists, check the Apps Script logs.`,
        { status: 500 }
      );
    }
  }

  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  // ── Attempt each model in the fallback chain ─────────────────────────────
  let lastError: GeminiApiError | null = null;

  for (const modelName of MODEL_CHAIN) {
    try {
      const result = await ai.models.generateContentStream({
        model: modelName,
        contents: [{ role: 'user', parts }],
        config: { systemInstruction },
      });

      let fullText = '';
      for await (const chunk of result) {
        const text = (chunk as GenerateContentResponse).text ?? '';
        fullText += text;
        onChunk(fullText);
      }

      return fullText;

    } catch (err: any) {
      console.warn(`[Gemini] Model ${modelName} failed:`, err?.message ?? err);
      const status = err?.status ?? err?.httpStatusCode;
      lastError = new GeminiApiError(
        err?.message ?? 'Gemini API call failed.',
        { status, model: modelName }
      );

      // Only fall through to next model on rate-limit or server errors
      if (status && status < 500 && status !== 429) break;
    }
  }

  console.error('[Gemini] All models exhausted:', lastError);
  throw lastError ?? new GeminiApiError('Could not reach the Gemini API after all fallback attempts.');
}
