import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from '../constants/systemPrompt';

// ── Configuration ────────────────────────────────────────────────────────────

/**
 * Ordered list of Gemini models to attempt, from most capable to lightest fallback.
 *
 * This chain is tuned to the confirmed available models for this project's API key.
 * Priority order:
 *   1. gemini-2.5-flash   — best speed/quality balance, primary choice
 *   2. gemini-2.0-flash   — stable GA release, reliable fallback
 *   3. gemini-2.0-flash-001 — pinned GA version, predictable behavior
 *   4. gemini-2.5-flash-lite — lightweight final fallback
 *
 * Update this list by querying:
 *   GET https://generativelanguage.googleapis.com/v1beta/models?key=<YOUR_KEY>
 */
const MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.5-flash-lite',
] as const;

// Maximum number of retries per model on transient errors (429, 503)
const TRANSIENT_RETRY_LIMIT = 2;
const TRANSIENT_RETRY_DELAY_MS = 1500;

// Errors that merit trying the next model vs. those that are unrecoverable
const SKIP_TO_NEXT_MODEL_STATUSES = new Set([403, 404, 429]);

// ── Custom Error Class ───────────────────────────────────────────────────────

/**
 * Structured error thrown when a Gemini API call fails.
 * Preserves HTTP status, model name, and raw API message for user-facing diagnostics.
 *
 * @example
 * catch (err) {
 *   if (err instanceof GeminiApiError) {
 *     console.log(err.status, err.model, err.details);
 *   }
 * }
 */
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

// ── SDK Initialization ───────────────────────────────────────────────────────

// Read key using Vite's import.meta.env convention first (canonical),
// with a fallback to the legacy process.env injection for AI Studio exports.
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY
  || process.env.GEMINI_API_KEY
  || '';

const ai = new GoogleGenAI({ apiKey });

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the numeric HTTP status from an API error object if available. */
function extractStatus(error: any): number | undefined {
  const raw = error?.status ?? error?.statusCode ?? error?.code;
  return typeof raw === 'number' ? raw : undefined;
}

/** Sleeps for the given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Streams a Gemini response for the given task input, automatically trying
 * each model in the fallback chain until one succeeds.
 *
 * Transient errors (429 rate-limit, 503 unavailable) are retried up to
 * TRANSIENT_RETRY_LIMIT times before moving to the next model.
 *
 * @param input         - Raw user text or image description to structure into tasks.
 * @param imageBase64   - Optional base64-encoded image for multimodal input.
 * @param imageMimeType - MIME type of the image (e.g., 'image/png').
 * @param onChunk       - Callback invoked with accumulated text after each stream chunk.
 * @returns The complete generated text.
 * @throws {GeminiApiError} with structured details if all models in the chain fail.
 */
export async function processTaskStream(
  input: string,
  imageBase64: string | undefined,
  imageMimeType: string | undefined,
  onChunk: (text: string) => void
): Promise<string> {
  // ── Pre-flight validation ──────────────────────────────────────────────────
  if (!apiKey) {
    throw new GeminiApiError(
      'No Gemini API key configured. Add VITE_GEMINI_API_KEY to your .env.local file.',
      { details: 'Missing VITE_GEMINI_API_KEY environment variable.' }
    );
  }

  // ── Build content payload ──────────────────────────────────────────────────
  const contents: any[] = [
    {
      text: `###Apply the aforementioned framework text to the following:\n\n${
        input || 'Extract tasks from the provided image.'
      }`
    }
  ];

  // Prepend image data if provided (multimodal input)
  if (imageBase64 && imageMimeType) {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    contents.unshift({
      inlineData: {
        data: base64Data,
        mimeType: imageMimeType
      }
    });
  }

  // ── Inject today's date for temporal reasoning ─────────────────────────────
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });
  const systemInstruction = SYSTEM_PROMPT.replace(/\{\{CURRENT_DATE\}\}/g, currentDate);

  // ── Model fallback loop ───────────────────────────────────────────────────
  let lastError: GeminiApiError | null = null;

  for (const model of MODEL_FALLBACK_CHAIN) {
    let attempt = 0;

    while (attempt <= TRANSIENT_RETRY_LIMIT) {
      try {
        console.info(`[Gemini] Trying model "${model}" (attempt ${attempt + 1})`);

        const responseStream = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.1,
          }
        });

        // Stream chunks — accumulate and forward to caller
        let fullText = '';
        for await (const chunk of responseStream) {
          const chunkText = chunk.text;
          if (chunkText) {
            fullText += chunkText;
            onChunk(fullText);
          }
        }

        // An empty response is treated as a soft failure — try next model
        if (!fullText || fullText.trim() === '') {
          lastError = new GeminiApiError(
            `Model "${model}" returned an empty response.`,
            { model, details: 'Empty stream output.' }
          );
          console.warn(`[Gemini] "${model}" returned empty text, skipping.`);
          break; // break inner retry loop, continue to next model
        }

        // ✅ Success
        console.info(`[Gemini] Success with model "${model}"`);
        return fullText;

      } catch (error: any) {
        const status = extractStatus(error);
        const rawMessage = error?.message ?? String(error);

        lastError = new GeminiApiError(
          `Model "${model}" failed: ${rawMessage}`,
          { status, model, details: rawMessage }
        );

        console.warn(`[Gemini] Model "${model}" failed (HTTP ${status ?? 'unknown'}): ${rawMessage}`);

        // Immediately move to the next model for definitive failures
        if (status !== undefined && SKIP_TO_NEXT_MODEL_STATUSES.has(status)) {
          console.warn(`[Gemini] Status ${status} — skipping "${model}" and trying next model.`);
          break; // break inner retry loop
        }

        // For transient/network errors, retry with a short delay
        if (attempt < TRANSIENT_RETRY_LIMIT) {
          const delay = TRANSIENT_RETRY_DELAY_MS * (attempt + 1);
          console.info(`[Gemini] Retrying "${model}" in ${delay}ms...`);
          await sleep(delay);
        }
      }

      attempt++;
    }
  }

  // ── All models exhausted ──────────────────────────────────────────────────
  const finalErr = lastError ?? new GeminiApiError('All Gemini models failed with no diagnostic information.');
  console.error('[Gemini] All models in fallback chain exhausted:', finalErr);
  throw finalErr;
}
