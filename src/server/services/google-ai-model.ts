import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash'
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: 'application/json'
};

// Stateless generation: a fresh call per request with no shared chat session or
// history. This prevents one user's prompt/PII from leaking into another user's
// request, and avoids unbounded history growth and concurrency corruption that a
// shared module-level `startChat` session causes on warm serverless instances.
export async function generateJsonContent(prompt: string): Promise<string> {
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig
  });

  return result.response.text();
}
