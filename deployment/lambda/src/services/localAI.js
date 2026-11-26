
import { askGeminiAI } from './geminiAI.js';

const GEMINI_TIMEOUT_MS = 45_000;

function withTimeout(promise, timeoutMs) {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Gemini request timed out.'));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout])
    .finally(() => clearTimeout(timeoutId));
}

export async function askLocalAI(messages, format) {
  return withTimeout(
    askGeminiAI(messages, format),
    GEMINI_TIMEOUT_MS
  );
}
