import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthlyComparison } from '../src/services/monthlyComparison.js';

test('calculates current and previous month totals correctly', () => {
  const results = [
    {
      _id: { month: '2026-11', type: 'income', category: 'Salary' },
      total: 5000000,
      count: 1
    },
    {
      _id: { month: '2026-11', type: 'expense', category: 'Food' },
      total: 1000000,
      count: 4
    },
    {
      _id: { month: '2026-10', type: 'expense', category: 'Food' },
      total: 800000,
      count: 3
    }
  ];

  const report = buildMonthlyComparison(results, '2026-11');

  assert.equal(report.month, '2026-11');
  assert.equal(report.previousMonth, '2026-10');
  assert.equal(report.current.income, 50000);
  assert.equal(report.current.expenses, 10000);
  assert.equal(report.current.netCashFlow, 40000);
  assert.equal(report.current.transactionCount, 5);
  assert.equal(report.previous.expenses, 8000);
  assert.equal(report.hasPreviousRecords, true);
  assert.equal(report.categoryComparison[0].change, 2000);
});

test('does not invent a previous-month comparison when no records exist', () => {
  const results = [
    {
      _id: { month: '2026-11', type: 'expense', category: 'Food' },
      total: 250000,
      count: 2
    }
  ];

  const report = buildMonthlyComparison(results, '2026-11');

  assert.equal(report.previous.hasRecords, false);
  assert.equal(report.hasPreviousRecords, false);
  assert.equal(report.previous.expenses, 0);
  assert.equal(report.categoryComparison[0].hasPreviousRecords, false);
  assert.equal(report.categoryComparison[0].changePercentage, null);
});

test('handles an empty transaction history', () => {
  const report = buildMonthlyComparison([], '2026-11');

  assert.equal(report.current.hasRecords, false);
  assert.equal(report.previous.hasRecords, false);
  assert.equal(report.current.income, 0);
  assert.equal(report.current.expenses, 0);
  assert.equal(report.categoryComparison.length, 0);
});
