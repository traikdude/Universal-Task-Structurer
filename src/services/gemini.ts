import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from '../constants/systemPrompt';

/**
 * Ordered list of Gemini models to attempt, from preferred to fallback.
 * This prevents hard failures when a specific model is unavailable
 * for a given API key's quota tier.
 */
const MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite-001',
] as const;

/**
 * Custom error class that preserves API-specific details
 * (status code, model name, raw message) for user-facing diagnostics.
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

// Initialize the SDK using Vite's import.meta.env convention.
// VITE_GEMINI_API_KEY is the canonical variable; fall back to the legacy
// process.env injection for backward compatibility with the AI Studio export.
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY
  || process.env.GEMINI_API_KEY
  || '';

const ai = new GoogleGenAI({ apiKey });

/**
 * Streams a Gemini response for the given task input, trying each model
 * in the fallback chain until one succeeds.
 *
 * @param input      – Raw user text to structure into tasks.
 * @param imageBase64 – Optional base64-encoded image for multimodal input.
 * @param imageMimeType – MIME type of the image (e.g., 'image/png').
 * @param onChunk    – Callback invoked with the accumulated text after each stream chunk.
 * @returns The complete generated text.
 * @throws {GeminiApiError} with structured details if all models fail.
 */
export async function processTaskStream(
  input: string,
  imageBase64: string | undefined,
  imageMimeType: string | undefined,
  onChunk: (text: string) => void
): Promise<string> {
  // Validate API key before making any network calls
  if (!apiKey) {
    throw new GeminiApiError(
      'No Gemini API key configured. Add VITE_GEMINI_API_KEY to your .env.local file.',
      { details: 'Missing API key in environment variables.' }
    );
  }

  // Build the content payload
  const contents: any[] = [
    { text: `###Apply the aforementioned framework text to the following:\n\n${input || 'Extract tasks from the provided image.'}` }
  ];

  if (imageBase64 && imageMimeType) {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    contents.unshift({
      inlineData: {
        data: base64Data,
        mimeType: imageMimeType
      }
    });
  }

  // Inject today's date into the system prompt for temporal reasoning
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });
  const systemInstruction = SYSTEM_PROMPT.replace(/\{\{CURRENT_DATE\}\}/g, currentDate);

  // Attempt each model in the fallback chain
  let lastError: unknown = null;

  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      const responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.1,
        }
      });

      let fullText = '';
      for await (const chunk of responseStream) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
          onChunk(fullText);
        }
      }

      if (!fullText || fullText.trim() === '') {
        // Model returned empty — try next in chain
        lastError = new GeminiApiError(
          `Model "${model}" returned an empty response.`,
          { model, details: 'Empty stream output.' }
        );
        continue;
      }

      return fullText;

    } catch (error: any) {
      // Extract structured details from Google API error responses
      const status = error?.status ?? error?.statusCode ?? error?.code;
      const rawMessage = error?.message ?? String(error);
      console.warn(`[Gemini] Model "${model}" failed (${status}): ${rawMessage}`);

      lastError = new GeminiApiError(
        `Model "${model}" is not available for your API key.`,
        {
          status: typeof status === 'number' ? status : undefined,
          model,
          details: rawMessage,
        }
      );
      // Continue to the next model in the chain
    }
  }

  // All models exhausted — throw a descriptive error
  const finalErr = lastError instanceof GeminiApiError
    ? lastError
    : new GeminiApiError('All Gemini models failed.', {
        details: String(lastError),
      });

  console.error('[Gemini] All models exhausted:', finalErr);
  throw finalErr;
}
