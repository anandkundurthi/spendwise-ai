import React from 'react';
import { Plus, Wallet } from 'lucide-react';
import { money } from '../../utils/dashboard';

function Budgets({ 
  budgets,
  unbudgetedSpending,
  insights, 
  comparison,
  month, 
  onMonthChange, 
  onAdd,
  icons
}) {
  const totalLimit = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  const totalRemaining = Math.max(0, totalLimit - totalSpent);
  const overallUsage = totalLimit > 0 ? totalSpent / totalLimit * 100 : 0;

  return (
    <>
      <div className="page-title-row">
        <div>
          <div className="eyebrow">A LITTLE ROOM TO BREATHE</div>
          <h1>Budgets</h1>
          <p>Think of these as gentle guardrails, not hard rules.</p>
        </div>
        <div className="budget-page-actions">
          <label className="budget-month-picker">
            <span>View month</span>
            <input
              type="month"
              value={month}
              onChange={(e) => onMonthChange(e.target.value)}
            />
          </label>
          <button className="primary-button" onClick={onAdd}>
            <Plus size={17} /> Create budget
          </button>
        </div>
      </div>

      <div className="budget-summary-grid">
        <div className="panel budget-summary-card">
          <span>PLANNED BUDGET</span>
          <strong>{money(totalLimit)}</strong>
          <small>Across {budgets.length} budget{budgets.length === 1 ? '' : 's'}</small>
        </div>
        <div className="panel budget-summary-card">
          <span>RECORDED SPENDING</span>
          <strong>{money(totalSpent)}</strong>
          <small>{overallUsage.toFixed(0)}% of planned budget</small>
        </div>
        <div className="panel budget-summary-card">
          <span>REMAINING</span>
          <strong>{money(totalRemaining)}</strong>
          <small>{totalSpent > totalLimit ? `${money(totalSpent - totalLimit)} over plan` : 'Room left in your budgets'}</small>
        </div>
      </div>

        
      {/* Monthly Spending Comparison */}
      {comparison && (
        <section className="monthly-comparison-panel">
          <div className="budget-section-heading">
            <div>
              <span className="section-kicker">MONTH-OVER-MONTH</span>
              <h3>Monthly spending comparison</h3>
              <p>See how your spending compares with the previous month.</p>
            </div>
          </div>

          <div className="comparison-summary-grid">
            <div className="panel budget-summary-card">
              <span>CURRENT MONTH</span>
              <strong>{money(comparison.currentTotal)}</strong>
              <small>{comparison.month}</small>
            </div>

            <div className="panel budget-summary-card">
              <span>PREVIOUS MONTH</span>
              <strong>{money(comparison.previousTotal)}</strong>
              <small>{comparison.previousMonth}</small>
            </div>

            <div className="panel budget-summary-card">
              <span>SPENDING CHANGE</span>
              <strong>
                {comparison.change > 0 ? '+' : ''}
                {money(comparison.change)}
              </strong>
              <small>
                {comparison.previousTotal === 0
                  ? 'New spending this month'
                  : `${comparison.changePercentage > 0 ? '+' : ''}${comparison.changePercentage}% compared with last month`}
              </small>
            </div>
          </div>

          {comparison.categoryComparison?.length > 0 && (
            <div className="panel comparison-category-panel">
              <h3>Category-wise comparison</h3>

              {comparison.categoryComparison.map((item) => (
                <div className="comparison-category-row" key={item.category}>
                  <strong>{item.category}</strong>
                  <span>
                    <small>Previous</small>
                    {money(item.previous)}
                  </span>
                  <span>
                    <small>Current</small>
                    {money(item.current)}
                  </span>
                  <span className={
                    item.current > item.previous
                      ? 'comparison-increased'
                      : item.current < item.previous
                        ? 'comparison-decreased'
                        : 'comparison-unchanged'
                  }>
                    {item.current > item.previous
                      ? 'Increased'
                      : item.current < item.previous
                        ? 'Decreased'
                        : 'Unchanged'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {insights && insights.length > 0 && (


        
  <section className="budget-insights-panel">
    <div className="budget-insights-heading">
      <div>
        <span className="section-kicker">SMART MONEY CHECK</span>
        <h3>Your budget insights</h3>
      </div>
      <span className="insights-count">
        {insights.length} insight{insights.length === 1 ? '' : 's'}
      </span>
    </div>

    <div className="budget-insights-list">
      {insights.map((insight, index) => (
        <div
          className={`budget-insight-item ${insight.type || 'info'}`}
          key={`${insight.title}-${index}`}
        >
          <div className="insight-indicator" />
          <div>
            <strong>{insight.title}</strong>
            <p>{insight.message}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
)}

      <div className="budget-section-heading">
        <div>
          <span className="section-kicker">CATEGORY BREAKDOWN</span>
          <h3>Your monthly guardrails</h3>
        </div>
        <span className="soft-count">{month}</span>
      </div>

      <div className="budget-cards">
        {budgets.length ? budgets.map((b) => {
          const usage = b.limit > 0 ? b.spent / b.limit * 100 : 0;
          const status = usage > 100
            ? 'Over budget'
            : usage >= 80
              ? 'Near limit'
              : 'On track';
          const remaining = Math.max(0, b.limit - b.spent);
          const Icon = icons[b.category] || Wallet;

          return (
            <div className="panel budget-card" key={b.id}>
              <div className="budget-card-top">
                <div className="category-icon tone-1"><Icon size={18} /></div>
                <span className={`budget-status ${usage > 100 ? 'over' : usage >= 80 ? 'near' : ''}`}>
                  {status}
                </span>
              </div>
              <h3>{b.category}</h3>
              <div className="budget-amount">
                {money(b.spent)} <span>of {money(b.limit)}</span>
              </div>
              <div className="budget-track">
                <i
                  className={usage > 100 ? 'over' : usage >= 80 ? 'near' : ''}
                  style={{ width: `${Math.min(100, Math.max(0, usage))}%` }}
                />
              </div>
              <div className="budget-card-footer">
                <span>{Math.min(100, Math.round(usage))}% used</span>
                <strong>{usage > 100 ? `${money(b.spent - b.limit)} over` : `${money(remaining)} left`}</strong>
              </div>
            </div>
          );
        }) : (
          <div className="panel empty-state">
            <Wallet size={28} />
            <strong>No budgets for this month</strong>
            <span>Choose one category that matters to you and create a gentle spending plan.</span>
            <button className="primary-button" onClick={onAdd}>
              Create your first budget
            </button>
          </div>
        )}
      </div>
        
     <section className="panel unbudgeted-panel">
        <div className="unbudgeted-header">
          <div>
            <span className="section-kicker">OUTSIDE YOUR PLAN</span>
            <h3>Unbudgeted spending</h3>
            <p>Expenses in categories where you haven't created a budget.</p>
         </div>

         <div className="unbudgeted-total">
           <span>Total</span>
           <strong>
             {money(
               unbudgetedSpending.reduce(
                (sum, item) => sum + Number(item.spent || 0),
                0
               )
             )}
           </strong>
         </div>
      </div>

  {unbudgetedSpending.length > 0 ? (
    <div className="unbudgeted-list">
      {unbudgetedSpending.map((item) => (
        <div className="unbudgeted-row" key={item.category}>
          <div>
            <strong>{item.category}</strong>
            <span>
              {item.transactionCount} transaction
              {item.transactionCount === 1 ? '' : 's'}
            </span>
          </div>
          <strong>{money(item.spent)}</strong>
        </div>
      ))}
    </div>
  ) : (
    <p className="unbudgeted-empty">
      No expenses outside your configured budgets this month.
    </p>
  )}
</section>
    </>
  );
}

export default Budgets;
