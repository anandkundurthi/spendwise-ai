import React from 'react';
import { Plus, Target } from 'lucide-react';
import { money } from '../../utils/dashboard';

function Goals({ goals, onAdd }) {
  return (
    <>
      <div className="page-title-row">
        <div>
          <div className="eyebrow">SOMETHING TO LOOK FORWARD TO</div>
          <h1>Savings goals</h1>
          <p>Small steps can take you somewhere meaningful.</p>
        </div>
        <button className="primary-button" onClick={onAdd}>
          <Plus size={17} /> Add a goal
        </button>
      </div>

      <div className="goal-grid">
        {goals.length ? goals.map((g) => (
          <div className="panel goal-card" key={g.id}>
            <div className="goal-spark"><Target size={20} /></div>
            <h3>{g.name}</h3>
            <div className="goal-numbers">
              <strong>{money(g.saved)}</strong>
              <span>of {money(g.target)}</span>
            </div>
            <div className="goal-track">
              <i style={{ width: `${Math.min(100, g.saved / g.target * 100)}%` }} />
            </div>
            <p>{Math.round(g.saved / g.target * 100)}% of the way there</p>
          </div>
        )) : (
          <div className="panel empty-state">
            <Target size={28} />
            <strong>What are you saving for?</strong>
            <span>
              A rainy-day fund, a new laptop, a trip—or something just for you.
            </span>
            <button className="primary-button" onClick={onAdd}>
              Create a savings goal
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default Goals;
