
const OLLAMA_URL =
  process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || 'llama3.2:3b';

export async function askLocalAI(messages, format) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      ...(format ? { format } : {})
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || 'Local AI service request failed.'
    );
  }

  const content = data.message?.content?.trim();

  if (!content) {
    throw new Error('Local AI returned an empty response.');
  }

  return content;
}
