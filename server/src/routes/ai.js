import { Router } from 'express';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getFinancialIntelligence } from '../services/financialIntelligence.js';
import { askLocalAI } from '../services/localAI.js';
import {
  getIndiaMonthKey,
  getPreviousMonthKey,
  getStoredDateMonthRange
} from '../utils/reportingDates.js';


// Only send the minimum required financial summaries to external AI providers.
function buildAiSafeIntelligence(intelligence) {
  return {
    transactionCount: intelligence.transactionCount,

    recurringExpenses: (intelligence.recurringExpenses || []).map(item => ({
      category: item.category,
      frequency: item.frequency,
      averageAmount: item.averageAmount,
      occurrences: item.occurrences,
      confidence: item.confidence
    })),

    unusualSpending: (intelligence.unusualSpending || []).map(item => ({
      category: item.category,
      recentSpending: item.recentSpending,
      historicalMonthlyAverage: item.historicalMonthlyAverage,
      increasePercentage: item.increasePercentage
    })),

    financialHealth: {
      score: intelligence.financialHealth?.score ?? null,
      status: intelligence.financialHealth?.status,
      explanation: intelligence.financialHealth?.explanation,
      savingsRate: intelligence.financialHealth?.savingsRate,
      recordedIncome: intelligence.financialHealth?.recordedIncome,
      recordedExpenses: intelligence.financialHealth?.recordedExpenses,
      recordedSavings: intelligence.financialHealth?.recordedSavings,
      expenseTransactionCount:
        intelligence.financialHealth?.expenseTransactionCount,
      coverage: intelligence.financialHealth?.coverage
    },

    spendingRecommendations: {
      month: intelligence.spendingRecommendations?.month,
      transactionCount:
        intelligence.spendingRecommendations?.transactionCount,
      totalExpenses:
        intelligence.spendingRecommendations?.totalExpenses,

      categories: (intelligence.spendingRecommendations?.categories || [])
        .map(item => ({
          category: item.category,
          amount: item.amount,
          sharePercentage: item.sharePercentage
        })),

      budgetRecommendations:
        (intelligence.spendingRecommendations?.budgetRecommendations || [])
          .map(item => ({
            category: item.category,
            spent: item.spent,
            budgetLimit: item.budgetLimit,
            remaining: item.remaining,
            usagePercentage: item.usagePercentage,
            status: item.status
          })),

      recommendations:
        (intelligence.spendingRecommendations?.recommendations || [])
          .map(item => ({
            type: item.type,
            priority: item.priority,
            category: item.category,
            title: item.title,
            message: item.message,
            amount: item.amount
          }))
    },

    categorySummary: (intelligence.categorySummary || []).map(item => ({
      category: item.category,
      amount: item.amount
    })),

    insights: (intelligence.insights || []).map(item => ({
      type: item.type,
      title: item.title,
      message: item.message
    }))
  };
}


const router = Router(); router.use(requireAuth);


router.post('/chat', asyncHandler(async (req, res) => {
  const question = String(req.body.message || '').trim();

  if (!question || question.length > 1000) {
    return res.status(400).json({
      message: 'Please enter a question (up to 1,000 characters).'
    });
  }

  const now = new Date();
  const currentMonth = getIndiaMonthKey(now);
  const previousMonth = getPreviousMonthKey(currentMonth);

  const { start: currentStart, end: nextStart } =
    getStoredDateMonthRange(currentMonth);

  const { start: previousStart } =
    getStoredDateMonthRange(previousMonth);

  const monthLabel = (date) =>
    date.toLocaleString('en-IN', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });

  const [
    currentTotals,
    currentCategories,
    previousTotals,
    previousCategories,
    budgets,
    intelligence
  ] = await Promise.all([
    Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: currentStart, $lt: nextStart },
          type: { $in: ['income', 'expense'] }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amountMinor' },
          count: { $sum: 1 }
        }
      }
    ]),

    Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: currentStart, $lt: nextStart },
          type: 'expense'
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amountMinor' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]),

    Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: previousStart, $lt: currentStart },
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

    Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: previousStart, $lt: currentStart },
          type: 'expense'
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amountMinor' }
        }
      }
    ]),

    Budget.find({
      user: req.user._id,
      month: currentMonth
    }).lean(),

    getFinancialIntelligence(req.user._id)
  ]);

  const toRupees = (value) => value / 100;

  const currentIncome = toRupees(
    currentTotals.find(item => item._id === 'income')?.total || 0
  );

  const currentExpenses = toRupees(
    currentTotals.find(item => item._id === 'expense')?.total || 0
  );

  const previousIncome = toRupees(
    previousTotals.find(item => item._id === 'income')?.total || 0
  );

  const previousExpenses = toRupees(
    previousTotals.find(item => item._id === 'expense')?.total || 0
  );

  const currentCategoryMap = new Map(
    currentCategories.map(item => [item._id, item.total])
  );

  const previousCategoryMap = new Map(
    previousCategories.map(item => [item._id, item.total])
  );

  // Calculate every budget category, not just the top five.
  const budgetAnalysis = budgets.map(budget => {
    const spentMinor =
      currentCategoryMap.get(budget.category) || 0;

    const limitMinor = budget.limitMinor;
    const remainingMinor = limitMinor - spentMinor;

    return {
      category: budget.category,
      limit: toRupees(limitMinor),
      spent: toRupees(spentMinor),
      remaining: toRupees(remainingMinor),
      usagePercentage: limitMinor > 0
        ? Math.round((spentMinor / limitMinor) * 100)
        : null,
      status: remainingMinor < 0
        ? 'over_budget'
        : remainingMinor === 0
          ? 'budget_exhausted'
          : 'within_budget'
    };
  });

  const categoryComparison = [
    ...new Set([
      ...currentCategoryMap.keys(),
      ...previousCategoryMap.keys()
    ])
  ].map(category => {
    const current = toRupees(
      currentCategoryMap.get(category) || 0
    );

    const previous = toRupees(
      previousCategoryMap.get(category) || 0
    );

    return {
      category,
      current,
      previous,
      change: current - previous,
      changePercentage: previous > 0
        ? Math.round(((current - previous) / previous) * 100)
        : null,
      hasPreviousRecords: previousCategoryMap.has(category)
    };
  }).sort((a, b) => b.current - a.current);

  const netCashFlow = currentIncome - currentExpenses;
  const previousNetCashFlow = previousIncome - previousExpenses;

  const financialContext = {
    currency: req.user.currency || 'INR',

    currentMonth: {
      name: monthLabel(currentStart),
      income: currentIncome,
      expenses: currentExpenses,
      netCashFlow,
      transactionCount: currentTotals.reduce(
        (sum, item) => sum + item.count,
        0
      )
    },

    previousMonth: {
      name: monthLabel(previousStart),
      income: previousIncome,
      expenses: previousExpenses,
      netCashFlow: previousNetCashFlow,
      transactionCount: previousTotals.reduce(
        (sum, item) => sum + item.count,
        0
      )
    },

    categorySpending: currentCategories.map(item => ({
      category: item._id,
      amount: toRupees(item.total),
      transactionCount: item.count
    })),

    categoryComparison,

    budgets: budgetAnalysis,

    spendingIntelligence: buildAiSafeIntelligence(intelligence)
  };

  // Only evaluate a purchase when the question expresses purchase intent.
  const lowerQuestion = question.toLowerCase();

  const purchaseIntent =
    /\b(afford|purchase|buy|buying|spend on|cost me|should i get)\b/.test(
      lowerQuestion
    );

  const amountMatch = question.match(
    /(?:₹|rs\.?\s*)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:rupees|inr)/i
  );

  let purchaseAnalysis = null;

  if (purchaseIntent && amountMatch) {
    const purchaseAmount = Number(
      (amountMatch[1] || amountMatch[2]).replace(/,/g, '')
    );

    if (Number.isFinite(purchaseAmount) && purchaseAmount > 0) {
      purchaseAnalysis = {
        purchaseAmount,
        recordedIncome: currentIncome,
        recordedExpenses: currentExpenses,
        recordedNetCashFlow: netCashFlow,
        hasRecordedIncome: currentIncome > 0,
        assessment: currentIncome <= 0
          ? 'insufficient_income_data'
          : netCashFlow < purchaseAmount
            ? 'not_supported_by_recorded_cash_flow'
            : 'within_recorded_cash_flow',
        cashFlowAfterPurchase: currentIncome > 0
          ? netCashFlow - purchaseAmount
          : null,
        warning:
          'Recorded net cash flow is not the same as bank balance or available cash. Other accounts, bills and obligations may not be recorded.'
      };
    }
  }

  financialContext.purchaseAnalysis = purchaseAnalysis;


const history = Array.isArray(req.body.history)
  ? req.body.history
      .filter(item =>
        item &&
        ['user', 'assistant'].includes(item.role) &&
        typeof item.content === 'string' &&
        item.content.trim().length > 0
      )
      .slice(-6)
      .map(item => ({
        role: item.role,
        content: item.content.trim().slice(0, 1000)
      }))
  : [];

if (history.length === 0) {
  history.push({
    role: 'user',
    content: question.slice(0, 1000)
  });
}


  const messages = [
    {
      role: 'system',
      content:
  'You are SpendWise, a careful and friendly personal finance assistant for India. ' +
  'Understand follow-up questions using the conversation history. ' +
  'The backend-calculated financial context is the single source of truth. ' +
  'Never invent, recalculate, change or contradict supplied financial figures. ' +

  'MONTHLY COMPARISONS: Check previousMonth.transactionCount before comparing months. ' +
  'If it is zero, clearly say that no previous-month transactions are recorded and a reliable comparison is unavailable. ' +
  'Never describe a category as having increased merely because its previous value is zero when hasPreviousRecords is false. ' +

  'BUDGETS: Use the supplied budget remaining, usage and status fields exactly. ' +

  'PURCHASE AFFORDABILITY: If purchaseAnalysis exists, use its assessment field. ' +
  'If the assessment is insufficient_income_data, explicitly say that no income is recorded for this month and affordability cannot be determined reliably. ' +
  'Do not say purchaseAnalysis is missing when it is present. ' +
  'Never describe recorded net cash flow as a bank balance or guaranteed available money. ' +
  'Never claim that a purchase is affordable or unaffordable based only on recorded income or net cash flow. ' +
  'Never assume the user has money available just because their recorded expenses are low. ' +
  'If affordability cannot be determined, clearly explain why and ask the user to consider their actual available balance, upcoming bills and financial obligations. ' +
  'Do not suggest a minimum required balance as if it were a personalized affordability calculation. ' +
  'Never expose internal field names, assessment codes, variable names or backend implementation details to the user. ' +
  'Explain financial assessments in simple, natural language. ' +
  'Never display raw JSON keys, property names or serialized backend data to the user. ' +

  'RECURRING PAYMENTS: Explain only recurring expenses supplied by the backend. ' +
  'If the list is empty, say no recurring payment pattern has been identified from the available transaction history. ' +

  'UNUSUAL SPENDING: Explain only unusual spending supplied by the backend. ' +
  'If the list is empty, say no unusual spending pattern has been identified from the available transaction history. ' +

  'MONTHLY SUMMARY: Summarise recorded income, expenses, net cash flow and budgets accurately. ' +
  'Clearly distinguish zero recorded transactions from missing data. ' +

  'Do not claim access to bank accounts. Never invent missing data. ' +
  'Do not provide regulated investment, tax or debt advice. ' +
  'Use INR currency formatting. ' +
  'Financial context: ' + JSON.stringify(financialContext)
    },
    ...history
  ];


  try {
    const reply = await askLocalAI(messages);

    return res.json({
      reply,
      mode: 'gemini',
      context: financialContext
    });




    } catch (error) {
    const errorText = [
      error?.message,
      error?.status,
      error?.code
    ].filter(Boolean).join(' ');

    console.error('Gemini chat error:', errorText);

    if (
      /RESOURCE_EXHAUSTED|quota exceeded|free.?tier.*limit/i.test(errorText)
    ) {
      return res.status(429).json({
        message:
          'Your Gemini free-tier daily limit has been reached. AI chat will be available again after your quota resets. Please try again later.',
        code: 'GEMINI_QUOTA_EXHAUSTED',
        mode: 'unavailable'
      });
    }

    if (/timed out|timeout/i.test(errorText)) {
      return res.status(504).json({
        message:
          'Gemini is taking too long to respond to your question. Please try again later.',
        code: 'GEMINI_TIMEOUT',
        mode: 'unavailable'
      });
    }

    return res.status(503).json({
      message:
        'SpendWise AI chat is temporarily unavailable because the Gemini service is experiencing an issue. Please try again later.',
      code: 'GEMINI_TEMPORARILY_UNAVAILABLE',
      mode: 'unavailable'
    });
  }
}));



router.post('/monthly-report', asyncHandler(async (req, res) => {
  const report = req.body.report;

  if (!report || typeof report !== 'object') {
    return res.status(400).json({
      message: 'Monthly report data is required.'
    });
  }

  const required = [
    'month',
    'previousMonth',
    'current',
    'previous',
    'categoryComparison'
  ];

  if (!required.every(key =>
    Object.prototype.hasOwnProperty.call(report, key)
  )) {
    return res.status(400).json({
      message: 'Monthly report data is incomplete.'
    });
  }

  if (
    !Array.isArray(report.categoryComparison) ||
    !report.current ||
    !report.previous
  ) {
    return res.status(400).json({
      message: 'Invalid monthly report structure.'
    });
  }

  const safeReport = {
    month: report.month,
    previousMonth: report.previousMonth,
    current: {
      income: Number(report.current.income) || 0,
      expenses: Number(report.current.expenses) || 0,
      netCashFlow: Number(report.current.netCashFlow) || 0,
      transactionCount: Number(report.current.transactionCount) || 0,
      hasRecords: Boolean(report.current.hasRecords)
    },
    previous: {
      income: Number(report.previous.income) || 0,
      expenses: Number(report.previous.expenses) || 0,
      netCashFlow: Number(report.previous.netCashFlow) || 0,
      transactionCount: Number(report.previous.transactionCount) || 0,
      hasRecords: Boolean(report.previous.hasRecords)
    },
    categoryComparison: report.categoryComparison.map(item => ({
      category: String(item.category || ''),
      current: Number(item.current) || 0,
      previous: Number(item.previous) || 0,
      hasPreviousRecords: Boolean(item.hasPreviousRecords)
    }))
  };

  try {
    const explanation = await askLocalAI([
      {
        role: 'system',
        
  
content:
  'You are SpendWise, a careful personal finance assistant for India. ' +
  'Write a concise, friendly monthly financial report using only the supplied data. ' +

  'FINANCIAL ACCURACY RULES: ' +
  'Never invent, estimate, or change financial figures. ' +
  'The supplied backend figures are the only source of truth. ' +
  'A value of zero means zero recorded activity, not missing data. ' +

  'STRICT HISTORICAL COMPARISON RULES: ' +
  'If previous.hasRecords is false, do not describe any category as increased, decreased, stable, or unchanged. ' +
  'Never use zero as a previous-month category value when historical records are unavailable. ' +
  'Do not calculate percentage changes without a valid previous-month baseline. ' +
  'State clearly that historical comparison is unavailable. ' +
  'Only describe current-month recorded amounts as facts. ' +
  'Do not invent spending trends or behavioural changes. ' +

  'PREVIOUS MONTH COMPARISON: ' +
  'If previous.hasRecords is false, previous-month data is unavailable. ' +
  'Never describe current spending as an increase, decrease, rise, fall, growth, or reduction compared with unavailable data. ' +
  'Never interpret a missing previous-month value as zero spending. ' +
  'Do not calculate percentage changes without a valid previous-month baseline. ' +

  'INCOME AND CASH FLOW: ' +
  'If current.income is zero, say that no income transactions are recorded for this month. ' +
  'Do not say income is unavailable merely because previous-month records are missing. ' +
  'Explain net cash flow using the supplied value. ' +
  'Net cash flow is the difference between recorded income and expenses. ' +
  'Never describe net cash flow as a bank balance, account balance, or available cash. ' +
  'Do not assess savings rate or purchase affordability without reliable income data. ' +

  'CATEGORY ANALYSIS: ' +
  'Report current category spending accurately. ' +
  'If previous-month category records are unavailable, say that a comparison cannot be made. ' +
  'Do not describe any category as increasing or decreasing without valid comparison data. ' +

  'OBSERVATIONS: ' +
  'Distinguish recorded facts from observations. ' +
  'Give at most three practical budgeting observations based only on available evidence. ' +
  'Do not invent spending patterns or recurring expenses. ' +
  'Do not provide investment, tax, or debt advice. ' +

  'Use INR formatting. Use clear Markdown headings, short paragraphs, and readable bullet points. ' +
  'Keep the report concise and easy to understand.'


      },
      {
        role: 'user',
        content:
          'Create my monthly financial report from this data:\n' +
          JSON.stringify(safeReport)
      }
    ]);

    return res.json({
      mode: 'gemini',
      explanation,
      generatedAt: new Date().toISOString()
    });
    } catch (error) {
    const errorText = [
      error?.message,
      error?.status,
      error?.code
    ].filter(Boolean).join(' ');

    console.error('Gemini monthly report error:', errorText);

    if (
      /RESOURCE_EXHAUSTED|quota exceeded|free.?tier.*limit/i.test(errorText)
    ) {
      return res.status(429).json({
        message:
          'Your Gemini free-tier daily limit has been reached. Monthly AI reports will be available again after your quota resets. Please try again later.',
        code: 'GEMINI_QUOTA_EXHAUSTED'
      });
    }

    if (/timed out|timeout/i.test(errorText)) {
      return res.status(504).json({
        message:
          'Gemini is taking too long to generate your monthly report. Please try again later.',
        code: 'GEMINI_TIMEOUT'
      });
    }

    return res.status(503).json({
      message:
        'Monthly AI reports are temporarily unavailable because the Gemini service is experiencing an issue. Please try again later.',
      code: 'GEMINI_TEMPORARILY_UNAVAILABLE'
    });
  }
}));


router.get('/insights', asyncHandler(async (req, res) => {
  const intelligence = await getFinancialIntelligence(req.user._id);

  const fallbackInsights = intelligence.insights || [];

  try {
    const aiResponse = await askLocalAI([
      {
        role: 'system',
        
content:
    
'You are SpendWise, a careful personal finance assistant for India. ' +
'Explain the supplied backend financial data in simple, helpful language. ' +

'Use spending categories to describe recorded spending distribution. ' +
'Use budget recommendations to explain actual budget usage and remaining amounts. ' +
'Use backend-generated insights as the source of recommendations. ' +

'Never invent, recalculate, or modify financial figures. ' +
'Never invent income, savings, expenses, budgets, or transaction history. ' +
'Never describe missing data as zero. ' +
'Never claim access to bank accounts or balances. ' +

'If financialHealth.score is null, do not give a score or assess financial health as healthy or at risk. ' +
'If income is not recorded, do not suggest savings targets or purchase affordability. ' +
'Do not treat the largest spending category as excessive merely because it is the largest. ' +
'Do not recommend reducing expenses without evidence of a specific concern. ' +
'If a budget is on track, acknowledge that it is on track. ' +

'Do not generate generic recommendations. ' +
'Do not suggest actions unsupported by the supplied data. ' +
'Return fewer insights rather than filling the response with generic advice. ' +
'Use INR formatting where amounts are mentioned. ' +

'Return valid JSON with an aiInsights array containing at most five objects. ' +
'Each object must contain a short title and a helpful message. ' +
'Use this structure: {"aiInsights":[{"title":"...","message":"..."}]}'

      },
      {
        role: 'user',
        content: JSON.stringify(buildAiSafeIntelligence(intelligence))
      }
    ], 'json');

    const parsed = JSON.parse(aiResponse);

    return res.json({
      mode: 'gemini',
      aiInsights: Array.isArray(parsed.aiInsights)
        ? parsed.aiInsights.slice(0, 5)
        : fallbackInsights,
      intelligence
    });
  } catch (error) {
    const errorText = [
      error?.message,
      error?.status,
      error?.code
    ].filter(Boolean).join(' ');

    console.error('Gemini insights error:', errorText);

    if (
      /RESOURCE_EXHAUSTED|quota exceeded|free.?tier.*limit/i.test(errorText)
    ) {
      return res.status(429).json({
        message:
          'Your Gemini free-tier daily limit has been reached. AI insights are temporarily unavailable until your quota resets.',
        code: 'GEMINI_QUOTA_EXHAUSTED',
        mode: 'unavailable',
        aiInsights: [],
        intelligence
      });
    }

    if (/timed out|timeout/i.test(errorText)) {
      return res.status(504).json({
        message:
          'Gemini is taking too long to generate financial insights. Please try again later.',
        code: 'GEMINI_TIMEOUT',
        mode: 'unavailable',
        aiInsights: [],
        intelligence
      });
    }

    return res.status(503).json({
      message:
        'AI financial insights are temporarily unavailable because the Gemini service is experiencing an issue.',
      code: 'GEMINI_TEMPORARILY_UNAVAILABLE',
      mode: 'unavailable',
      aiInsights: [],
      intelligence
    });
  }

}));



export default router;
