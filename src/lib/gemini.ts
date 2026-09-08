/**
 * The one call this app makes to the Gemini API.
 *
 * Written against the REST endpoint rather than through @google/genai: the
 * SDK is 277 KB minified, roughly a fifth of the whole bundle, and every
 * player downloads it whether or not they ever generate a card back. The
 * request and response shapes below are the ones the SDK itself builds.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-3.1-flash-image-preview';

/** Raised for anything the caller should show the player. The message is user-facing. */
export class GeminiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiError';
  }
}

interface InlineData {
  mimeType?: string;
  data?: string;
}

interface ResponsePart {
  text?: string;
  inlineData?: InlineData;
}

interface GenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: ResponsePart[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
}

/** Turn the player's words into the prompt the model actually receives. */
export function buildCardBackPrompt(prompt: string): string {
  return `${prompt}, playing card back design, symmetrical, vector art, minimalist borders, high contrast, aspect ratio 5:7`;
}

/** Map a failed response onto something worth showing a player. */
function describeFailure(status: number, body: GenerateContentResponse | null): string {
  const apiMessage = body?.error?.message?.trim();

  if (status === 400 && /api[\s_-]?key/i.test(apiMessage ?? '')) {
    return 'That API key was not accepted. Check it in Settings and try again.';
  }
  if (status === 401 || status === 403) {
    return 'That API key is not authorised for image generation.';
  }
  if (status === 429) {
    return 'Gemini is rate limiting this key. Wait a moment and try again.';
  }
  if (status >= 500) {
    return 'Gemini is having trouble right now. Try again in a minute.';
  }
  return apiMessage || `Gemini refused the request (HTTP ${status}).`;
}

/**
 * Generate one card back and return it as a data: URI.
 *
 * @param apiKey the player's own key, from settings
 * @param prompt what the player typed
 * @param signal optional, so a closing dialog can abandon the request
 */
export async function generateCardBack(
  apiKey: string,
  prompt: string,
  signal?: AbortSignal
): Promise<string> {
  if (!apiKey) throw new GeminiError('Add your Gemini API key in Settings first.');
  if (!prompt.trim()) throw new GeminiError('Describe the card back you want.');

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildCardBackPrompt(prompt) }] }],
        generationConfig: {
          imageConfig: { aspectRatio: '3:4', imageSize: '512px' },
        },
      }),
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new GeminiError('Could not reach Gemini. Check your connection and try again.');
  }

  let body: GenerateContentResponse | null = null;
  try {
    body = (await response.json()) as GenerateContentResponse;
  } catch {
    body = null;
  }

  if (!response.ok) throw new GeminiError(describeFailure(response.status, body));

  const blockReason = body?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new GeminiError('That prompt was blocked by Gemini. Try describing it differently.');
  }

  const parts = body?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const data = part.inlineData?.data;
    if (data) {
      const mimeType = part.inlineData?.mimeType || 'image/png';
      return `data:${mimeType};base64,${data}`;
    }
  }

  throw new GeminiError('Gemini replied without an image. Try a different description.');
}
