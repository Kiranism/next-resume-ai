// AI text generation via OpenRouter (OpenAI-compatible chat completions).
// One request per call (stateless). The model is configurable with
// OPENROUTER_MODEL; default is a cheap, reliable JSON-capable model.
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

export async function generateJsonContent(prompt: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
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
