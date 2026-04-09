import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from '../constants/systemPrompt';

// Initialize the SDK. It automatically picks up process.env.GEMINI_API_KEY
// if configured via Vite define.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function processTaskStream(
  input: string, 
  imageBase64: string | undefined, 
  imageMimeType: string | undefined,
  onChunk: (text: string) => void
): Promise<string> {
  try {
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

    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const systemInstruction = SYSTEM_PROMPT.replace(/\{\{CURRENT_DATE\}\}/g, currentDate);

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-pro',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
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
    return fullText || 'No output generated.';
  } catch (error) {
    console.error("Error generating task:", error);
    throw new Error("Failed to process task input.");
  }
}
