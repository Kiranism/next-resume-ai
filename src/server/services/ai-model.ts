// AI text generation via OpenRouter (OpenAI-compatible chat completions).
// One request per call (stateless).
//
// Two model tiers, both env-overridable (switch models without a deploy):
//  - 'fast'    (default) — high-frequency calls: chat edits, ATS analysis,
//    keyword extraction. Env: OPENROUTER_MODEL.
//  - 'writing' — the rare, quality-defining calls: resume creation and the
//    writing critique, where prose quality IS the product. Env:
//    OPENROUTER_MODEL_WRITING (falls back to the fast tier when unset).
export type ModelTier = 'fast' | 'writing';

const DEFAULT_FAST_MODEL = 'anthropic/claude-haiku-4.5';
const DEFAULT_WRITING_MODEL = 'anthropic/claude-sonnet-4.5';

function resolveModel(tier: ModelTier): string {
  const fast = process.env.OPENROUTER_MODEL?.trim();
  if (tier === 'writing') {
    return (
      process.env.OPENROUTER_MODEL_WRITING?.trim() ||
      fast ||
      DEFAULT_WRITING_MODEL
    );
  }
  return fast || DEFAULT_FAST_MODEL;
}

export async function generateJsonContent(
  prompt: string,
  opts?: { tier?: ModelTier }
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = resolveModel(opts?.tier ?? 'fast');

  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is not set — add your OpenRouter key to .env (OPENROUTER_API_KEY=sk-or-...) and restart the dev server.'
    );
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a precise data-extraction assistant. Respond with a single valid JSON object only — no markdown code fences and no commentary.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `OpenRouter request failed (${res.status}): ${detail.slice(0, 300)}`
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenRouter returned an empty response');
  }

  // Strip accidental code fences if a model ignores response_format.
  return content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

// Streaming variant: streams an OpenAI-compatible chat completion, invoking
// onToken for each content delta, and resolves with the full accumulated text.
// Used by the chat endpoint so replies render token-by-token.
export async function streamChatCompletion(
  prompt: string,
  onToken: (delta: string) => void
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  // Chat is the high-frequency, latency-sensitive path → fast tier.
  const model = resolveModel('fast');

  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is not set — add your OpenRouter key to .env (OPENROUTER_API_KEY=sk-or-...) and restart the dev server.'
    );
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            "You are an expert resume assistant. Follow the user's requested output format exactly."
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      stream: true
    })
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `OpenRouter request failed (${res.status}): ${detail.slice(0, 300)}`
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  // Parse the SSE stream line-by-line: each event is a `data: {json}` line;
  // `data: [DONE]` ends it; comment/keepalive lines are ignored.
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line.startsWith('data:')) continue;

      const data = line.slice(5).trim();
      if (data === '[DONE]') return full;

      try {
        const json = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = json.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta.length > 0) {
          full += delta;
          onToken(delta);
        }
      } catch {
        // Ignore malformed/partial SSE fragments.
      }
    }
  }

  return full;
}
