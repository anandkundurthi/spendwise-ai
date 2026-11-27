import React, { useMemo, useState } from 'react';
import { Plus, Search, ReceiptText } from 'lucide-react';
import { categories, dateForInput } from '../../utils/dashboard';
import TransactionRows from '../TransactionRows';

export default function Transactions({
  transactions,
  onAdd,
  onEdit,
  onDelete,
  icons
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return transactions.filter((t) => {
      const matchesSearch = !term || [
        t.merchant,
        t.category,
        t.note
      ].some((value) => (value || '').toLowerCase().includes(term));

      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      const matchesCategory =
        categoryFilter === 'all' || t.category === categoryFilter;

      const transactionDate = dateForInput(t.date);
      const matchesFrom = !fromDate || transactionDate >= fromDate;
      const matchesTo = !toDate || transactionDate <= toDate;

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [transactions, search, typeFilter, categoryFilter, fromDate, toDate]);

  function clearFilters() {
    setSearch('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setFromDate('');
    setToDate('');
  }

  return (
    <>
      <div className="page-title-row">
        <div>
          <div className="eyebrow">YOUR MONEY, IN MOTION</div>
          <h1>Transactions</h1>
          <p>Every little thing that makes up your money story.</p>
        </div>
        <button className="primary-button" onClick={onAdd}>
          <Plus size={17} /> Add transaction
        </button>
      </div>

      <section className="panel full-panel">
        <div className="transaction-tools">
          <div className="transaction-search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search merchant, category or note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-row">
            <div className="filter-tabs">
              {[
                { value: 'all', label: 'Everything' },
                { value: 'income', label: 'Money in' },
                { value: 'expense', label: 'Money out' },
                { value: 'transfer', label: 'Transfers' }
              ].map((item) => (
                <button
                  key={item.value}
                  className={typeFilter === item.value ? 'selected' : ''}
                  onClick={() => setTypeFilter(item.value)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <span className="soft-count">
              {filtered.length} of {transactions.length} transactions
            </span>
          </div>

          <div className="transaction-filter-grid">
            <label>
              Category
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            <label>
              From date
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>

            <label>
              To date
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>

            <button
              className="clear-filters-button"
              onClick={clearFilters}
              type="button"
            >
              Clear filters
            </button>
          </div>
        </div>

        {filtered.length ? (
          <TransactionRows
            transactions={filtered}
            onEdit={onEdit}
            onDelete={onDelete}
            icons={icons}
          />
        ) : (
          <div className="empty-state">
            <ReceiptText size={28} />
            <strong>No matching transactions</strong>
            <span>Try changing your search or filters.</span>
            <button
              className="secondary-button"
              onClick={clearFilters}
              type="button"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </>
  );
}
