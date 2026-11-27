import Transaction from '../models/Transaction.js';
import {
  getPreviousMonthKey,
  getStoredDateMonthRange
} from '../utils/reportingDates.js';

export function buildMonthlyComparison(results, month) {
  const previousMonth = getPreviousMonthKey(month);

  const currentData = results.filter(
    item => item._id.month === month
  );

  const previousData = results.filter(
    item => item._id.month === previousMonth
  );

  const summarise = (items) => {
    const income = items
      .filter(item => item._id.type === 'income')
      .reduce((sum, item) => sum + item.total, 0) / 100;

    const expenses = items
      .filter(item => item._id.type === 'expense')
      .reduce((sum, item) => sum + item.total, 0) / 100;

    return {
      income,
      expenses,
      netCashFlow: income - expenses,
      transactionCount: items.reduce(
        (sum, item) => sum + item.count,
        0
      ),
      hasRecords: items.length > 0,
      savingsRate: income > 0
        ? ((income - expenses) / income) * 100
        : null
    };
  };

  const current = summarise(currentData);
  const previous = summarise(previousData);

  const categoryNames = new Set([
    ...currentData
      .filter(item => item._id.type === 'expense')
      .map(item => item._id.category),
    ...previousData
      .filter(item => item._id.type === 'expense')
      .map(item => item._id.category)
  ]);

  const categoryComparison = [...categoryNames].map(category => {
    const currentItem = currentData.find(
      item => item._id.type === 'expense' &&
        item._id.category === category
    );

    const previousItem = previousData.find(
      item => item._id.type === 'expense' &&
        item._id.category === category
    );

    const currentAmount = (currentItem?.total || 0) / 100;
    const previousAmount = (previousItem?.total || 0) / 100;

    return {
      category,
      current: currentAmount,
      previous: previousAmount,
      hasPreviousRecords: Boolean(previousItem),
      hasCurrentRecords: Boolean(currentItem),
      change: currentAmount - previousAmount,
      changePercentage: previousAmount > 0
        ? ((currentAmount - previousAmount) / previousAmount) * 100
        : null
    };
  }).sort((a, b) => b.current - a.current);

  return {
    month,
    previousMonth,
    current,
    previous,
    currentTotal: current.expenses,
    previousTotal: previous.expenses,
    change: current.expenses - previous.expenses,
    changePercentage: previous.expenses > 0
      ? ((current.expenses - previous.expenses) / previous.expenses) * 100
      : null,
    hasPreviousRecords: previous.hasRecords,
    hasCurrentRecords: current.hasRecords,
    categoryComparison
  };
}

export async function getMonthlyComparison(userId, month) {
  const previousMonth = getPreviousMonthKey(month);
  const { start: previousStart } = getStoredDateMonthRange(previousMonth);
  const { end: currentEnd } = getStoredDateMonthRange(month);

  const results = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: { $in: ['income', 'expense'] },
        date: { $gte: previousStart, $lt: currentEnd }
      }
    },
    {
      $group: {
        _id: {
          month: {
            $dateToString: {
              format: '%Y-%m',
              date: '$date',
              timezone: 'UTC'
            }
          },
          type: '$type',
          category: '$category'
        },
        total: { $sum: '$amountMinor' },
        count: { $sum: 1 }
      }
    }
  ]);

  return buildMonthlyComparison(results, month);
}
