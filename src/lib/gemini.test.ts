import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiError, buildCardBackPrompt, generateCardBack } from './gemini';

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
  vi.stubGlobal('fetch', fn);
  return fn as unknown as ReturnType<typeof vi.fn>;
}

const imageResponse = {
  candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'AAAB' } }] } }],
};

afterEach(() => vi.unstubAllGlobals());

describe('buildCardBackPrompt', () => {
  it('keeps the player’s words and adds the card-back styling', () => {
    const prompt = buildCardBackPrompt('cyberpunk neon cityscape');
    expect(prompt).toContain('cyberpunk neon cityscape');
    expect(prompt).toContain('playing card back design');
  });
});

describe('generateCardBack', () => {
  it('returns the image as a data URI', async () => {
    mockFetch(200, imageResponse);
    await expect(generateCardBack('key', 'dragons')).resolves.toBe('data:image/png;base64,AAAB');
  });

  it('falls back to png when the response omits a mime type', async () => {
    mockFetch(200, { candidates: [{ content: { parts: [{ inlineData: { data: 'ZZ' } }] } }] });
    await expect(generateCardBack('key', 'dragons')).resolves.toBe('data:image/png;base64,ZZ');
  });

  it('skips commentary parts and takes the image', async () => {
    mockFetch(200, {
      candidates: [
        { content: { parts: [{ text: 'Here is your design' }, { inlineData: { data: 'QQ' } }] } },
      ],
    });
    await expect(generateCardBack('key', 'dragons')).resolves.toBe('data:image/png;base64,QQ');
  });

  it('sends the key as a header, never in the URL', async () => {
    // A key in a query string ends up in logs and browser history.
    const fetchMock = mockFetch(200, imageResponse);
    await generateCardBack('secret-key', 'dragons');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain('secret-key');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('secret-key');
  });

  it('posts the shape the model expects', async () => {
    const fetchMock = mockFetch(200, imageResponse);
    await generateCardBack('key', 'dragons');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent'
    );
    const sent = JSON.parse(init.body as string);
    expect(sent.contents[0].parts[0].text).toContain('dragons');
    expect(sent.generationConfig.imageConfig).toEqual({ aspectRatio: '3:4', imageSize: '512px' });
  });

  it('refuses to call out without a key', async () => {
    const fetchMock = mockFetch(200, imageResponse);
    await expect(generateCardBack('', 'dragons')).rejects.toBeInstanceOf(GeminiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses to call out without a prompt', async () => {
    const fetchMock = mockFetch(200, imageResponse);
    await expect(generateCardBack('key', '   ')).rejects.toBeInstanceOf(GeminiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('names the key when the key is the problem', async () => {
    mockFetch(400, { error: { message: 'API key not valid. Please pass a valid API key.' } });
    await expect(generateCardBack('bad', 'dragons')).rejects.toThrow(/API key was not accepted/);
  });

  it('explains a rate limit as something to wait out', async () => {
    mockFetch(429, { error: { message: 'Quota exceeded' } });
    await expect(generateCardBack('key', 'dragons')).rejects.toThrow(/rate limiting/i);
  });

  it('blames itself, not the player, for a server error', async () => {
    mockFetch(503, {});
    await expect(generateCardBack('key', 'dragons')).rejects.toThrow(/trouble right now/);
  });

  it('passes through an unexpected API message rather than inventing one', async () => {
    mockFetch(418, { error: { message: 'Model is not available in your region' } });
    await expect(generateCardBack('key', 'dragons')).rejects.toThrow(/not available in your region/);
  });

  it('survives an error body that is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('not json');
        },
      })) as unknown as typeof fetch
    );
    await expect(generateCardBack('key', 'dragons')).rejects.toThrow(/trouble right now/);
  });

  it('says so when the prompt was blocked', async () => {
    mockFetch(200, { promptFeedback: { blockReason: 'SAFETY' } });
    await expect(generateCardBack('key', 'dragons')).rejects.toThrow(/blocked by Gemini/);
  });

  it('says so when the reply carries no image', async () => {
    mockFetch(200, { candidates: [{ content: { parts: [{ text: 'I cannot do that' }] } }] });
    await expect(generateCardBack('key', 'dragons')).rejects.toThrow(/without an image/);
  });

  it('reports a network failure as a connection problem', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }) as unknown as typeof fetch
    );
    await expect(generateCardBack('key', 'dragons')).rejects.toThrow(/Could not reach Gemini/);
  });

  it('lets an abort propagate instead of dressing it as an error', async () => {
    // A dialog closing mid-request should cancel quietly, not show a message.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('The user aborted a request.', 'AbortError');
      }) as unknown as typeof fetch
    );
    await expect(generateCardBack('key', 'dragons')).rejects.toThrowError(
      expect.objectContaining({ name: 'AbortError' })
    );
  });
});
