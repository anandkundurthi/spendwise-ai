import React from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { money } from '../utils/dashboard';

export default function TransactionRows({
  transactions,
  onEdit,
  onDelete,
  icons
}) {
  return (
    <div className="transaction-list">
      {transactions.map((t) => {
        const Icon = icons[t.category] || MoreHorizontal;

        return (
          <div className="transaction-row" key={t.id}>
            <div className="transaction-icon"><Icon size={17} /></div>

            <div className="transaction-description">
              <strong>{t.merchant || t.category}</strong>
              <span>
                {t.category} · {t.paymentMethod || 'Other'} ·
                {' '}{new Date(t.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
              {t.note && <small className="transaction-note">{t.note}</small>}
            </div>

            <strong className={`transaction-amount ${t.type}`}>
              {t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''}
              {money(t.amount)}
            </strong>

            {(onEdit || onDelete) && (
              <div className="transaction-actions">
                {onEdit && (
                  <button
                    className="edit-button"
                    onClick={() => onEdit(t)}
                    title="Edit transaction"
                    type="button"
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    className="delete-button"
                    onClick={() => onDelete(t.id)}
                    title="Delete transaction"
                    type="button"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
