
import { Router } from 'express';
import { z } from 'zod';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(requireAuth);

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

function getMonthRange(month) {
  const [year, monthNumber] = month.split('-').map(Number);

  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1))
  };
}

function getBudgetStatus(percentage) {
  if (percentage >= 100) return 'over';
  if (percentage >= 80) return 'warning';
  return 'healthy';
}

router.get('/', asyncHandler(async (req, res) => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const month = monthPattern.test(req.query.month || '')
    ? req.query.month
    : currentMonth;

  const { start, end } = getMonthRange(month);

  const [budgetDocs, spending] = await Promise.all([
    Budget.find({
      user: req.user._id,
      month
    }).sort({ category: 1 }),

    Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: 'expense',
          date: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amountMinor' },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ])
  ]);

  const spendingMap = new Map(
    spending.map((item) => [
      item._id,
      {
        amount: item.total / 100,
        transactionCount: item.transactionCount
      }
    ])
  );

  const budgets = budgetDocs.map((budget) => {
    const data = spendingMap.get(budget.category) || {
      amount: 0,
      transactionCount: 0
    };

    const limit = budget.limitMinor / 100;
    const spent = data.amount;
    const remaining = limit - spent;
    const percentage = Math.round((spent / limit) * 100);

    return {
      id: budget._id,
      category: budget.category,
      month,
      limit,
      spent,
      remaining,
      percentage,
      overBy: Math.max(0, spent - limit),
      transactionCount: data.transactionCount,
      status: getBudgetStatus(percentage)
    };
  });

  const budgetedCategories = new Set(
    budgetDocs.map((budget) => budget.category)
  );

  const unbudgetedSpending = spending
    .filter((item) => !budgetedCategories.has(item._id))
    .map((item) => ({
      category: item._id,
      spent: item.total / 100,
      transactionCount: item.transactionCount
    }));

  const totals = {
    budgeted: budgets.reduce((sum, b) => sum + b.limit, 0),
    spent: budgets.reduce((sum, b) => sum + b.spent, 0),
    remaining: 0,
    overBudgetCount: budgets.filter((b) => b.status === 'over').length,
    warningCount: budgets.filter((b) => b.status === 'warning').length,
    categoryCount: budgets.length
  };

  totals.remaining = totals.budgeted - totals.spent;

  const insights = [];

  if (budgets.length === 0) {
    insights.push({
      type: 'info',
      title: 'Start with a simple plan',
      message: 'Create a category budget to compare your spending with your plans.'
    });
  } else {
    if (totals.overBudgetCount > 0) {
      insights.push({
        type: 'danger',
        title: `${totals.overBudgetCount} budget(s) over limit`,
        message: 'Some categories have exceeded their planned limits. Review those expenses before making further spending decisions.'
      });
    }

    if (totals.warningCount > 0) {
      insights.push({
        type: 'warning',
        title: `${totals.warningCount} budget(s) nearing their limit`,
        message: 'These categories have used at least 80% of their budget.'
      });
    }

    if (totals.overBudgetCount === 0 && totals.warningCount === 0) {
      insights.push({
        type: 'success',
        title: 'Your budgets are within their limits',
        message: 'All configured categories are currently below 80% of their planned budgets.'
      });
    }
  }

  if (unbudgetedSpending.length > 0) {
    insights.push({
      type: 'info',
      title: 'Spending outside your budgets',
      message: `You have expenses in ${unbudgetedSpending.length} categories without a configured budget.`
    });
  }

  res.json({
    month,
    budgets,
    totals,
    unbudgetedSpending,
    insights
  });
}));

router.post('/', asyncHandler(async (req, res) => {
  const parsed = z.object({
    category: z.string().trim().min(1).max(60),
    limit: z.number().positive().max(100000000),
    month: z.string().regex(monthPattern)
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Enter a valid category, positive budget and month.'
    });
  }

  const data = parsed.data;

  const budget = await Budget.findOneAndUpdate(
    {
      user: req.user._id,
      category: data.category,
      month: data.month
    },
    {
      $set: {
        limitMinor: Math.round(data.limit * 100)
      }
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );

  res.status(201).json({
    budget: {
      id: budget._id,
      category: budget.category,
      limit: budget.limitMinor / 100,
      month: budget.month
    }
  });
}));

export default router;

