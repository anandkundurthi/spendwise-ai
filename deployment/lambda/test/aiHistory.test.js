import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChatHistory } from '../src/utils/aiHistory.js';

test('accepts frontend user and assistant messages', () => {
  const result = normalizeChatHistory([
    { role: 'assistant', content: 'Welcome!' },
    { role: 'user', content: '  How much did I spend?  ' }
  ], 'Fallback');

  assert.equal(result.error, undefined);
  assert.deepEqual(result.history, [
    { role: 'assistant', content: 'Welcome!' },
    { role: 'user', content: 'How much did I spend?' }
  ]);
});

test('uses the question when history is missing', () => {
  const result = normalizeChatHistory(undefined, 'My question');

  assert.deepEqual(result.history, [
    { role: 'user', content: 'My question' }
  ]);
});

test('rejects non-array history', () => {
  assert.ok(normalizeChatHistory({}, 'Question').error);
  assert.ok(normalizeChatHistory(null, 'Question').error);
});

test('rejects more than ten messages', () => {
  const messages = Array.from({ length: 11 }, () => ({
    role: 'user',
    content: 'Hello'
  }));

  assert.match(
    normalizeChatHistory(messages, 'Question').error,
    /at most 10/
  );
});

test('rejects invalid roles and message structures', () => {
  const invalidMessages = [
    null,
    [],
    { role: 'system', content: 'Invalid role' },
    { role: 'user', content: 123 },
    { role: 'user', content: '   ' }
  ];

  for (const message of invalidMessages) {
    assert.ok(normalizeChatHistory([message], 'Question').error);
  }
});

test('rejects messages longer than 1000 characters', () => {
  const result = normalizeChatHistory([
    { role: 'user', content: 'a'.repeat(1001) }
  ], 'Question');

  assert.ok(result.error);
});

test('rejects history longer than 6000 characters', () => {
  const messages = Array.from({ length: 7 }, () => ({
    role: 'user',
    content: 'a'.repeat(900)
  }));

  assert.match(
    normalizeChatHistory(messages, 'Question').error,
    /too long/
  );
});

test('keeps only the latest six valid messages', () => {
  const messages = Array.from({ length: 10 }, (_, index) => ({
    role: index % 2 ? 'user' : 'assistant',
    content: `Message ${index}`
  }));

  const result = normalizeChatHistory(messages, 'Question');

  assert.equal(result.history.length, 6);
  assert.equal(result.history[0].content, 'Message 4');
  assert.equal(result.history[5].content, 'Message 9');
});
