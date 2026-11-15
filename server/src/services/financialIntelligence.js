import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';

const toRupees = (paise) => paise / 100;

const average = (values) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;


function generateSpendingRecommendations(transactions, budgets, now) {
  const month = now.toISOString().slice(0, 7);

  const currentExpenses = transactions.filter((item) =>
    item.type === 'expense' &&
    new Date(item.date).toISOString().slice(0, 7) === month
  );

  const categoryTotals = new Map();

  for (const transaction of currentExpenses) {
    const category = transaction.category;
    categoryTotals.set(
      category,
      (categoryTotals.get(category) || 0) + transaction.amountMinor
    );
  }

  const totalExpenses = currentExpenses.reduce(
    (sum, item) => sum + item.amountMinor,
    0
  );

  const categories = [...categoryTotals.entries()]
    .map(([category, total]) => ({
      category,
      amount: toRupees(total),
      sharePercentage: totalExpenses > 0
        ? Math.round((total / totalExpenses) * 100)
        : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  const budgetRecommendations = budgets.map((budget) => {
    const spentMinor = categoryTotals.get(budget.category) || 0;
    const limitMinor = budget.limitMinor;
    const usage = (spentMinor / limitMinor) * 100;
    const remainingMinor = limitMinor - spentMinor;

    let status = 'on_track';

    if (usage >= 100) {
      status = 'over_budget';
    } else if (usage >= 80) {
      status = 'approaching_limit';
    }

    return {
      category: budget.category,
      spent: toRupees(spentMinor),
      budgetLimit: toRupees(limitMinor),
      remaining: toRupees(remainingMinor),
      usagePercentage: Math.round(usage),
      status
    };
  }).sort((a, b) => b.usagePercentage - a.usagePercentage);

  const recommendations = [];

  if (categories.length > 0) {
    const highest = categories[0];

    recommendations.push({
      type: 'spending_pattern',
      priority: 'info',
      category: highest.category,
      title: 'Your highest spending category',
      message:
        `${highest.category} accounts for ${highest.sharePercentage}% ` +
        `of your recorded expenses this month.`,
      amount: highest.amount
    });
  }

  for (const budget of budgetRecommendations) {
    if (budget.status === 'over_budget') {
      recommendations.push({
        type: 'budget_alert',
        priority: 'high',
        category: budget.category,
        title: 'Budget limit exceeded',
        message:
          `You have exceeded your ${budget.category} budget by ` +
          `₹${Math.abs(budget.remaining).toLocaleString('en-IN')}.`,
        amount: Math.abs(budget.remaining)
      });
    } else if (budget.status === 'approaching_limit') {
      recommendations.push({
        type: 'budget_alert',
        priority: 'medium',
        category: budget.category,
        title: 'Budget approaching its limit',
        message:
          `You have used ${budget.usagePercentage}% of your ` +
          `${budget.category} budget.`,
        amount: budget.remaining
      });
    }
  }

  return {
    month,
    transactionCount: currentExpenses.length,
    totalExpenses: toRupees(totalExpenses),
    categories,
    budgetRecommendations,
    recommendations
  };
}


function detectRecurringExpenses(transactions) {
  const merchants = new Map();

  for (const transaction of transactions) {
    const merchant = transaction.merchant?.trim().toLowerCase();
    if (!merchant || transaction.type !== 'expense') continue;

    if (!merchants.has(merchant)) merchants.set(merchant, []);
    merchants.get(merchant).push(transaction);
  }

  const recurring = [];

  for (const [merchant, records] of merchants) {
    if (records.length < 3) continue;

    records.sort((a, b) => new Date(a.date) - new Date(b.date));

    const intervals = [];
    for (let i = 1; i < records.length; i++) {
      const days = Math.round(
        (new Date(records[i].date) - new Date(records[i - 1].date)) /
        (24 * 60 * 60 * 1000)
      );
      intervals.push(days);
    }

    const typicalInterval = average(intervals);
    const consistent = intervals.every(
      (days) => Math.abs(days - typicalInterval) <= Math.max(5, typicalInterval * 0.2)
    );

    const monthlyPattern = typicalInterval >= 25 && typicalInterval <= 35;
    const weeklyPattern = typicalInterval >= 5 && typicalInterval <= 9;

    if (!consistent || (!monthlyPattern && !weeklyPattern)) continue;

    const latest = records[records.length - 1];
    const nextDate = new Date(latest.date);
    nextDate.setUTCDate(
      nextDate.getUTCDate() + Math.round(typicalInterval)
    );

    recurring.push({
      merchant: latest.merchant.trim(),
      category: latest.category,
      frequency: monthlyPattern ? 'Monthly' : 'Weekly',
      averageAmount: toRupees(average(records.map((item) => item.amountMinor))),
      lastPayment: latest.date,
      estimatedNextPayment: nextDate,
      occurrences: records.length,
      confidence: records.length >= 4 ? 'High' : 'Moderate',
      note: 'Estimated from recorded transactions; not a confirmed scheduled payment.'
    });
  }

  return recurring.sort((a, b) => b.averageAmount - a.averageAmount);
}

function detectUnusualSpending(transactions, now) {
  const currentStart = new Date(now);
  currentStart.setUTCDate(currentStart.getUTCDate() - 30);

  const baselineStart = new Date(currentStart);
  baselineStart.setUTCDate(baselineStart.getUTCDate() - 90);

  const current = new Map();
  const baseline = new Map();
  const baselineCounts = new Map();

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;

    const date = new Date(transaction.date);
    const category = transaction.category;

    if (date >= currentStart && date <= now) {
      current.set(category, (current.get(category) || 0) + transaction.amountMinor);
    } else if (date >= baselineStart && date < currentStart) {
      baseline.set(category, (baseline.get(category) || 0) + transaction.amountMinor);
      baselineCounts.set(category, (baselineCounts.get(category) || 0) + 1);
    }
  }

  const alerts = [];

  for (const [category, currentTotal] of current) {
    const previousTotal = baseline.get(category) || 0;
    const historicalCount = baselineCounts.get(category) || 0;

    if (historicalCount < 3) continue;
    const averageMonthly = previousTotal / 3;
    
    if (averageMonthly < 10000) continue;

    const increase = ((currentTotal - averageMonthly) / averageMonthly) * 100;

    if (increase >= 75) {
      alerts.push({
        category,
        recentSpending: toRupees(currentTotal),
        historicalMonthlyAverage: toRupees(averageMonthly),
        increasePercentage: Math.round(increase),
        message: `${category} spending is ${Math.round(increase)}% higher than its previous 90-day monthly average.`
      });
    }
  }

  return alerts.sort((a, b) => b.increasePercentage - a.increasePercentage);
}


function calculateFinancialHealth(transactions, budgets, now) {
  const month = now.toISOString().slice(0, 7);

  const monthTransactions = transactions.filter(
    (item) => new Date(item.date).toISOString().slice(0, 7) === month
  );

  const incomeTransactions = monthTransactions.filter(
    (item) => item.type === 'income'
  );

  const expenseTransactions = monthTransactions.filter(
    (item) => item.type === 'expense'
  );

  const income = incomeTransactions.reduce(
    (sum, item) => sum + item.amountMinor,
    0
  );

  const expenses = expenseTransactions.reduce(
    (sum, item) => sum + item.amountMinor,
    0
  );

  const expenseCount = expenseTransactions.length;
  const savings = income - expenses;
  const savingsRate = income > 0 ? (savings / income) * 100 : null;

  const hasEnoughData =
    incomeTransactions.length >= 1 &&
    expenseCount >= 3 &&
    monthTransactions.length >= 5;

  if (!hasEnoughData) {
    return {
      score: null,
      status: 'Insufficient data',
      explanation:
        'Record at least one income and three expense transactions, with five transactions in total this month, to calculate an indicative score.',
      components: [],
      savingsRate,
      recordedIncome: toRupees(income),
      recordedExpenses: toRupees(expenses),
      recordedSavings: toRupees(savings),
      expenseTransactionCount: expenseCount,
      coverage: 'Insufficient'
    };
  }

  const savingsScore = Math.max(
    0,
    Math.min(100, (savingsRate / 30) * 100)
  );

  const components = [];
  let score = savingsScore;
  let coverage = 'Partial';

  components.push({
    name: 'Savings behaviour',
    score: Math.round(savingsScore),
    weight: budgets.length > 0 ? '60%' : '100%',
    detail: `Recorded savings rate: ${savingsRate.toFixed(1)}%. A 30% savings rate reaches the maximum score for this component.`
  });

  if (budgets.length > 0) {
    const totalLimit = budgets.reduce(
      (sum, item) => sum + item.limitMinor,
      0
    );

    const totalSpent = budgets.reduce((sum, budget) => {
      const categorySpent = expenseTransactions
        .filter(
          (transaction) => transaction.category === budget.category
        )
        .reduce(
          (amount, transaction) => amount + transaction.amountMinor,
          0
        );

      return sum + categorySpent;
    }, 0);

    const usage = totalLimit > 0 ? totalSpent / totalLimit : 1;

    const budgetScore = Math.max(
      0,
      Math.min(100, 100 - Math.max(0, usage * 100 - 50) * 2)
    );

    components.push({
      name: 'Budget adherence',
      score: Math.round(budgetScore),
      weight: '40%',
      detail: `Configured budgets are ${Math.round(usage * 100)}% used.`
    });

    score = savingsScore * 0.6 + budgetScore * 0.4;
    coverage = 'Full';
  }

  score = Math.round(score);

  return {
    score,
    status:
      score >= 75
        ? 'Healthy'
        : score >= 50
          ? 'Needs attention'
          : 'At risk',
    explanation:
      coverage === 'Partial'
        ? 'Preliminary score based on recorded savings behaviour. Add monthly budgets to include budget adherence.'
        : 'Indicative score based on recorded savings behaviour and configured monthly budgets. This is not a credit score or a complete assessment of your finances.',
    components,
    savingsRate,
    recordedIncome: toRupees(income),
    recordedExpenses: toRupees(expenses),
    recordedSavings: toRupees(savings),
    expenseTransactionCount: expenseCount,
    coverage
  };
}


export async function getFinancialIntelligence(userId) {
  const now = new Date();
  const historyStart = new Date(now);
  historyStart.setUTCDate(historyStart.getUTCDate() - 180);

  const month = now.toISOString().slice(0, 7);

  const [transactions, budgets] = await Promise.all([
    Transaction.find({
      user: userId,
      date: { $gte: historyStart, $lte: now },
      type: { $in: ['income', 'expense'] }
    }).sort({ date: 1 }).lean(),

    Budget.find({ user: userId, month }).lean()
  ]);

  const recurringExpenses = detectRecurringExpenses(transactions);
  const unusualSpending = detectUnusualSpending(transactions, now);
  const financialHealth = calculateFinancialHealth(transactions, budgets, now);
  const spendingRecommendations = generateSpendingRecommendations(
  transactions,
  budgets,
  now
);

  const topCategories = new Map();

  for (const item of transactions) {
    if (item.type !== 'expense') continue;
    topCategories.set(
      item.category,
      (topCategories.get(item.category) || 0) + item.amountMinor
    );
  }

  const categorySummary = [...topCategories.entries()]
    .map(([category, total]) => ({
      category,
      amount: toRupees(total)
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const insights = [];

  if (recurringExpenses.length) {
    insights.push({
      type: 'recurring',
      title: 'Possible recurring payments',
      message: `We detected ${recurringExpenses.length} possible recurring merchant payment pattern(s). Review them to confirm whether they are subscriptions or regular bills.`
    });
  }

  if (unusualSpending.length) {
    insights.push({
      type: 'warning',
      title: 'Unusual spending detected',
      message: `${unusualSpending.length} spending categor${unusualSpending.length === 1 ? 'y is' : 'ies are'} higher than your recorded historical baseline.`
    });
  }

  if (financialHealth.score !== null) {
    insights.push({
      type: 'health',
      title: `Financial health: ${financialHealth.status}`,
      message: `Your indicative financial health score is ${financialHealth.score}/100.`
    });
  } else {
    insights.push({
      type: 'info',
      title: 'Build your financial history',
      message: financialHealth.explanation
    });
  }

  if (!transactions.length) {
    insights.push({
      type: 'info',
      title: 'Start recording transactions',
      message: 'Add income and expenses to unlock spending patterns and personalised insights.'
    });
  }

  return {
    generatedAt: now,
    historyDays: 180,
    transactionCount: transactions.length,
    recurringExpenses,
    unusualSpending,
    financialHealth,
    spendingRecommendations,
    categorySummary,
    insights
  };
}