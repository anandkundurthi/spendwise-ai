import { Router } from 'express';
import Transaction from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getFinancialIntelligence } from '../services/financialIntelligence.js';
import { getMonthlyComparison } from '../services/monthlyComparison.js';
import {
  getIndiaMonthKey,
  getStoredDateMonthRange
} from '../utils/reportingDates.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', asyncHandler(async (req, res) => {
  const month = getIndiaMonthKey();
  const { start, end } = getStoredDateMonthRange(month);

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
    : getIndiaMonthKey();

  const comparison = await getMonthlyComparison(req.user._id, month);

  res.json(comparison);
}));


router.get('/intelligence', asyncHandler(async (req, res) => {
  const intelligence = await getFinancialIntelligence(req.user._id);
  res.json(intelligence);
}));

export default router;
