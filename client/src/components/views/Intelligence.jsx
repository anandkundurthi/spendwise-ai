import React from 'react';
import {
  LoaderCircle,
  Sparkles,
  CalendarDays,
  ArrowUpRight
} from 'lucide-react';
import { money } from '../../utils/dashboard';

function Intelligence({ 
  data, 
  loading, 
  error, 
  onRetry, 
  onChat,
  aiInsights = [],
  aiInsightsMode = 'basic'
 }) {
  const health = data?.financialHealth;
  const spendingRecommendations = data?.spendingRecommendations;
  const recommendations = spendingRecommendations?.recommendations || [];
  const categorySpending = spendingRecommendations?.categories || [];
  const budgetRecommendations = spendingRecommendations?.budgetRecommendations || [];
  const recurring = data?.recurringExpenses || [];
  const unusual = data?.unusualSpending || [];
  const insights = data?.insights || [];
  const displayedInsights = aiInsights.length
  ? aiInsights
  : insights;
  console.log('SpendWise insight rendering:', {
  aiInsightsCount: aiInsights.length,
  displayedCount: displayedInsights.length,
  mode: aiInsightsMode
});

  const formatDate = (value) => {
    if (!value) return 'Not available';
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading && !data) {
    return (
      <div className="empty-state">
        <LoaderCircle className="spin" size={28} />
        <strong>Analysing your financial activity...</strong>
        <span>Looking for spending patterns and useful insights.</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <section className="panel">
        <div className="empty-state">
          <strong>Unable to load financial intelligence</strong>
          <span>{error}</span>
          <button className="primary-button" onClick={onRetry}>
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (!data) return null;

  return (
    <div className="intelligence-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">YOUR FINANCIAL ASSISTANT</span>
          <h1>Financial Intelligence</h1>
          <p>Understand your money patterns and make informed decisions.</p>
        </div>
        <button className="primary-button" onClick={onRetry} disabled={loading}>
          <Sparkles size={15} />
          {loading ? 'Analysing...' : 'Refresh analysis'}
        </button>
      </div>

      <section className="intelligence-overview">
        <div className="health-score-card">
          <span className="section-kicker">FINANCIAL HEALTH SCORE</span>
          <div className="health-score-ring"
            style={{
              '--score': `${health?.score ?? 0}%`
            }}
          >
            <div>
              <strong>{health?.score ?? '—'}</strong>
              <span>/100</span>
            </div>
          </div>
          <h2>{health?.status || 'Building your profile'}</h2>
          <p>{health?.explanation || 'More financial records are needed.'}</p>
        </div>

        <div className="health-details panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">SCORE BREAKDOWN</span>
              <h3>What influences your score?</h3>
            </div>
            <Sparkles size={19} />
          </div>

          {health?.components?.length ? (
            health.components.map((item) => (
              <div className="health-factor" key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.score}/100 · {item.weight}</span>
                </div>
                <div className="budget-track">
                  <i style={{ width: `${item.score}%` }} />
                </div>
                <p>{item.detail}</p>
              </div>
            ))
          ) : (
            <div className="empty-small">
              Add more income and expense transactions to unlock your score breakdown.
            </div>
          )}
        </div>
      </section>

      <section className="intelligence-metrics">
        <div className="panel intelligence-metric">
          <span className="section-kicker">RECORDS ANALYSED</span>
          <strong>{data.transactionCount ?? 0}</strong>
          <span>Transactions in the last {data.historyDays ?? 180} days</span>
        </div>
        <div className="panel intelligence-metric">
          <span className="section-kicker">RECURRING PATTERNS</span>
          <strong>{recurring.length}</strong>
          <span>Possible regular payments</span>
        </div>
        <div className="panel intelligence-metric">
          <span className="section-kicker">SPENDING ALERTS</span>
          <strong>{unusual.length}</strong>
          <span>Categories needing attention</span>
        </div>
      </section>

      
      <section className="panel intelligence-section">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">PERSONALIZED FINANCIAL GUIDANCE</span>
            <h3>Spending recommendations</h3>
            <p>
              Practical observations based on your recorded spending and budgets.
            </p>
          </div>
          <Sparkles size={19} />
        </div>

        {spendingRecommendations?.transactionCount > 0 ? (
          <>
            <div className="intelligence-metrics">
              <div className="intelligence-metric">
                <span className="section-kicker">MONTHLY EXPENSES</span>
                <strong>{money(spendingRecommendations.totalExpenses)}</strong>
                <span>
                  {spendingRecommendations.transactionCount} recorded transactions
                </span>
              </div>

              <div className="intelligence-metric">
                <span className="section-kicker">CATEGORIES TRACKED</span>
                <strong>{categorySpending.length}</strong>
                <span>Spending categories this month</span>
              </div>
            </div>

            <h4>Where your money goes</h4>

            {categorySpending.map((item) => (
              <div className="health-factor" key={item.category}>
                <div>
                  <strong>{item.category}</strong>
                  <span>
                    {money(item.amount)} · {item.sharePercentage}% of expenses
                  </span>
                </div>

                <div className="budget-track">
                  <i
                    style={{
                      width: `${item.sharePercentage}%`
                    }}
                  />
                </div>
              </div>
            ))}

            <h4>Budget recommendations</h4>

            {budgetRecommendations.length ? (
              <div className="intelligence-list">
                {budgetRecommendations.map((item) => (
                  <div className="intelligence-list-item" key={item.category}>
                    <div className="intelligence-item-icon">
                      <Sparkles size={18} />
                    </div>

                    <div className="intelligence-item-copy">
                      <strong>{item.category}</strong>

                      <span>
                        Spent {money(item.spent)} of {money(item.budgetLimit)}
                      </span>

                      <div className="budget-track">
                        <i
                          style={{
                            width: `${Math.min(item.usagePercentage, 100)}%`
                          }}
                        />
                      </div>

                      <small>
                        {item.status === 'over_budget'
                          ? `Exceeded by ${money(Math.abs(item.remaining))}`
                          : `${money(item.remaining)} remaining`}
                      </small>
                    </div>

                    <badge
                      color={
                        item.status === 'over_budget'
                          ? 'danger'
                          : item.status === 'approaching_limit'
                            ? 'warning'
                            : 'success'
                      }
                    >
                      {item.status === 'over_budget'
                        ? 'Over budget'
                        : item.status === 'approaching_limit'
                          ? 'Near limit'
                          : 'On track'}
                    </badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-small">
                No monthly budgets configured yet.
              </div>
            )}

            <h4>Personalized observations</h4>

            {recommendations.length ? (
              <div className="intelligence-insights">
                {recommendations.map((item, index) => (
                  <div
                    className="insight-strip"
                    key={`${item.type}-${item.category}-${index}`}
                  >
                    <div className="insight-icon">
                      <Sparkles size={17} />
                    </div>

                    <div className="insight-copy">
                      <strong>{item.title}</strong>
                      <p>{item.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-small">
                More recorded transactions will help generate useful recommendations.
              </div>
            )}
          </>
        ) : (
          <div className="empty-small">
            Record some expenses this month to unlock personalized spending recommendations.
          </div>
        )}
      </section>

      
      <section className="panel intelligence-section">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">PAYMENT PATTERNS</span>
            <h3>Recurring expenses</h3>
          </div>
          <CalendarDays size={19} />
        </div>

        {recurring.length ? (
          <div className="intelligence-list">
            {recurring.map((item, index) => (
              <div className="intelligence-list-item" key={`${item.merchant}-${index}`}>
                <div className="intelligence-item-icon">
                  <CalendarDays size={18} />
                </div>
                <div className="intelligence-item-copy">
                  <strong>{item.merchant}</strong>
                  <span>{item.category} · {item.frequency} · {item.confidence} confidence</span>
                  <small>Last payment: {formatDate(item.lastPayment)}</small>
                  <small>Estimated next payment: {formatDate(item.estimatedNextPayment)}</small>
                  <small>{item.note}</small>
                </div>
                <strong className="intelligence-amount">{money(item.averageAmount)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-small">
            No consistent weekly or monthly merchant payment patterns detected yet.
            More transaction history may help identify them.
          </div>
        )}
      </section>

      <section className="panel intelligence-section">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">SPENDING MONITOR</span>
            <h3>Unusual spending alerts</h3>
          </div>
          <ArrowUpRight size={19} />
        </div>

        {unusual.length ? (
          <div className="intelligence-list">
            {unusual.map((item) => (
              <div className="intelligence-list-item" key={item.category}>
                <div className="intelligence-item-icon alert-icon">
                  <ArrowUpRight size={18} />
                </div>
                <div className="intelligence-item-copy">
                  <strong>{item.category}</strong>
                  <span>{item.message}</span>
                  <small>
                    Historical monthly average: {money(item.historicalMonthlyAverage)}
                  </small>
                </div>
                <div className="intelligence-alert-value">
                  <strong>+{item.increasePercentage}%</strong>
                  <span>{money(item.recentSpending)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-small">
            No unusual spending alerts were detected against the available historical baseline.
          </div>
        )}
        <p className="intelligence-footnote">
          Alerts compare the latest 30 days with the preceding 90-day monthly average.
        </p>
      </section>

      <section className="panel intelligence-section">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">
              {aiInsights.length > 0 && aiInsightsMode === 'gemini'
                ? 'GEMINI AI-POWERED OBSERVATIONS'
                : aiInsights.length > 0 && aiInsightsMode === 'ai'
                  ? 'AI-POWERED OBSERVATIONS'
                  : 'PERSONALISED OBSERVATIONS'}
            </span>
            <h3>Your spending insights</h3>
            <small>
              {aiInsights.length
                ? aiInsightsMode === 'gemini'
                  ? 'Gemini AI-powered observations'
                  : aiInsightsMode === 'ai'
                    ? 'AI-powered observations'
                    : 'Rule-based observations'
                : 'Based on your recorded financial activity'}
            </small>
          </div>
          <Sparkles size={19} />
        </div>

        {displayedInsights.length ? (
          <div className="intelligence-insights">
            {displayedInsights.map((item, index) => (
              <div className="insight-strip" key={`${item.title}-${index}`}>
                <div className="insight-icon">
                  <Sparkles size={17} />
                </div>
                <div className="insight-copy">
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-small">
            Add more transactions to generate useful spending observations.
          </div>
        )}

        <button className="primary-button intelligence-chat-button" onClick={onChat}>
          <Sparkles size={15} />
          Ask SpendWise about my finances
        </button>
      </section>

      <p className="intelligence-disclaimer">
        Analysis is based only on transactions recorded in SpendWise.
        Recurring payments are estimates, not confirmed scheduled debits.
        The financial health score is an indicative budgeting measure,
        not a credit score or a complete financial assessment.
      </p>
    </div>
  );
}

export default Intelligence;
