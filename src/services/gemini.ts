import { SYSTEM_PROMPT } from '../constants/systemPrompt';

// ── Configuration ────────────────────────────────────────────────────────────

// The Universal Gen-AI Gateway URL (Production)
// This proxy handles Model Fallbacks, Retries, and Secret Management on the server.
const GATEWAY_URL = "https://smart-prompt-builder-825046261103.us-central1.run.app/api/v1/generate/stream";

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

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Streams a Gemini response via the secure Backend Gateway.
 * 
 * Secure: No API keys are exposed to the client.
 * Robust: Server-side model fallback (Flash -> 2.0 -> 1.5).
 */
export async function processTaskStream(
  input: string,
  imageBase64: string | undefined,
  imageMimeType: string | undefined,
  onChunk: (text: string) => void
): Promise<string> {
  
  // ── Build content payload ──────────────────────────────────────────────────
  const contents: any[] = [
    {
      text: `###Apply the aforementioned framework text to the following:\n\n${
        input || 'Extract tasks from the provided image.'
      }`
    }
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

  // ── Inject today's date ────────────────────────────────────────────────────
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });
  const systemInstruction = SYSTEM_PROMPT.replace(/\{\{CURRENT_DATE\}\}/g, currentDate);

  // ── Execute Gateway Request ────────────────────────────────────────────────
  try {
    const response = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_name: "2.5", // Requested primary alias
        contents,
        system_instruction: systemInstruction
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new GeminiApiError(
        errorData.detail || 'The Gen-AI Gateway encountered an error.',
        { status: response.status }
      );
    }

    // ── Stream Processing ────────────────────────────────────────────────────
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Neural stream initialization failed.');

    let fullText = '';
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      
      // Handle server-side exhaustion errors reported in the stream
      if (chunk.includes('[GATEWAY_ERROR]')) {
        throw new GeminiApiError('Neural Engine capacity reached. Please try again later.', { details: chunk });
      }

      fullText += chunk;
      onChunk(fullText);
    }

    return fullText;

  } catch (error: any) {
    console.error('[Gemini] Gateway communication failed:', error);
    if (error instanceof GeminiApiError) throw error;
    throw new GeminiApiError('Could not establish connection to Neural Engine.');
  }
}
