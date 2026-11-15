import { Router } from 'express';
import Transaction from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getFinancialIntelligence } from '../services/financialIntelligence.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', asyncHandler(async (req, res) => {
  const now = new Date();

  // Current month boundaries in UTC.
  const start = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    1
  ));

  const end = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    1
  ));

  const monthlyMatch = {
    user: req.user._id,
    date: { $gte: start, $lt: end }
  };

  const [totals, categories, dailySpending, recent] = await Promise.all([
    // Monthly income and expenses.
    Transaction.aggregate([
      {
        $match: {
          ...monthlyMatch,
          type: { $in: ['income', 'expense'] }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amountMinor' }
        }
      }
    ]),

    // Monthly expense totals by category.
    Transaction.aggregate([
      {
        $match: {
          ...monthlyMatch,
          type: 'expense'
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amountMinor' }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 6 }
    ]),

    // Actual daily expense totals for the current month.
    Transaction.aggregate([
      {
        $match: {
          ...monthlyMatch,
          type: 'expense'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$date',
              timezone: 'UTC'
            }
          },
          total: { $sum: '$amountMinor' }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    // Latest transactions.
    Transaction.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(6)
  ]);

  const income =
    (totals.find((x) => x._id === 'income')?.total || 0) / 100;

  const expenses =
    (totals.find((x) => x._id === 'expense')?.total || 0) / 100;

  res.json({
    summary: {
      income,
      expenses,
      net: income - expenses,
      currency: req.user.currency
    },

    categories: categories.map((x) => ({
      category: x._id,
      amount: x.total / 100
    })),

    dailySpending: dailySpending.map((x) => ({
      date: x._id,
      amount: x.total / 100
    })),

    recent: recent.map((t) => ({
      id: t._id,
      type: t.type,
      amount: t.amountMinor / 100,
      category: t.category,
      merchant: t.merchant,
      date: t.date,
      paymentMethod: t.paymentMethod
    }))
  });
}));


router.get('/comparison', asyncHandler(async (req, res) => {
  const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

  const month = monthPattern.test(req.query.month || '')
    ? req.query.month
    : new Date().toISOString().slice(0, 7);

  const [year, monthNumber] = month.split('-').map(Number);

  const currentStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const currentEnd = new Date(Date.UTC(year, monthNumber, 1));
  const previousStart = new Date(Date.UTC(year, monthNumber - 2, 1));

  const results = await Transaction.aggregate([
    {
      $match: {
        user: req.user._id,
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

  const previousMonth = previousStart.toISOString().slice(0, 7);

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

  res.json({
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
  });
}));


router.get('/intelligence', asyncHandler(async (req, res) => {
  const intelligence = await getFinancialIntelligence(req.user._id);
  res.json(intelligence);
}));

export default router;

