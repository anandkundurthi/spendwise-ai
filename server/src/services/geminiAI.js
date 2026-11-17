
import { GoogleGenAI } from '@google/genai';

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

export async function askGeminiAI(messages, format) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured.');
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  const systemMessage = messages.find(
    message => message.role === 'system'
  );

  const contents = messages
    .filter(message =>
      ['user', 'assistant'].includes(message.role) &&
      typeof message.content === 'string' &&
      message.content.trim()
    )
    .map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }]
    }));

  if (!contents.length) {
    throw new Error('No valid messages provided to Gemini.');
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      ...(systemMessage?.content
        ? { systemInstruction: systemMessage.content }
        : {}),
      ...(format === 'json'
        ? { responseMimeType: 'application/json' }
        : {})
    }
  });

  const content = response.text?.trim();

  if (!content) {
    throw new Error('Gemini returned an empty response.');
  }

  return content;
}
