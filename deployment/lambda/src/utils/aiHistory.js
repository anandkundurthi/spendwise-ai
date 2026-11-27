export function normalizeChatHistory(rawHistory, fallbackQuestion) {
  if (rawHistory !== undefined && !Array.isArray(rawHistory)) {
    return { error: 'Conversation history must be an array.' };
  }

  const entries = rawHistory ?? [];

  if (entries.length > 10) {
    return { error: 'Conversation history must contain at most 10 messages.' };
  }

  let totalHistoryLength = 0;

  for (const item of entries) {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item) ||
      !['user', 'assistant'].includes(item.role) ||
      typeof item.content !== 'string' ||
      !item.content.trim() ||
      item.content.trim().length > 1000
    ) {
      return { error: 'Conversation history contains an invalid message.' };
    }

    totalHistoryLength += item.content.trim().length;
  }

  if (totalHistoryLength > 6000) {
    return { error: 'Conversation history is too long.' };
  }

  const history = entries.slice(-6).map(item => ({
    role: item.role,
    content: item.content.trim()
  }));

  if (history.length === 0) {
    history.push({
      role: 'user',
      content: fallbackQuestion.slice(0, 1000)
    });
  }

  return { history };
}
