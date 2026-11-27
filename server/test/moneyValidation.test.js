import test from 'node:test';
import assert from 'node:assert/strict';
import {
  positiveAmountSchema,
  nonNegativeAmountSchema,
  goalInputSchema
} from '../src/utils/moneyValidation.js';

test('accepts positive amounts with up to two decimal places', () => {
  for (const amount of [1, 100, 100.5, 100.50, 0.01, 100000000]) {
    assert.equal(positiveAmountSchema.safeParse(amount).success, true);
  }
});

test('rejects zero, negative, excessive and over-precision amounts', () => {
  for (const amount of [0, -1, 100.555, 100000001]) {
    assert.equal(positiveAmountSchema.safeParse(amount).success, false);
  }
});

test('allows zero saved amount and valid paise precision', () => {
  for (const amount of [0, 0.01, 100.5]) {
    assert.equal(nonNegativeAmountSchema.safeParse(amount).success, true);
  }
});

test('rejects saved amounts with more than two decimal places', () => {
  assert.equal(nonNegativeAmountSchema.safeParse(10.555).success, false);
});

test('accepts a valid goal and optional saved amount', () => {
  assert.equal(goalInputSchema.safeParse({
    name: 'Emergency fund',
    target: 50000,
    saved: 1250.5
  }).success, true);
});

test('rejects a goal when saved amount exceeds target', () => {
  assert.equal(goalInputSchema.safeParse({
    name: 'Emergency fund',
    target: 50000,
    saved: 50000.01
  }).success, false);
});

test('rejects invalid goal target precision', () => {
  assert.equal(goalInputSchema.safeParse({
    name: 'Emergency fund',
    target: 500.555
  }).success, false);
});
