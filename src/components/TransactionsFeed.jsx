import React from 'react';
import { formatINR } from '../utils.js';

export default function TransactionsFeed({
  transactions,
  filter,
  onFilterChange,
  onDeleteTransaction,
  onOpenAdd,
  onRollShock
}) {
  return (
    <div className="card-box" data-testid="feed-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">📜 Transactions & Surprise Life Feed</h2>
          <p className="section-subtitle">Complete ledger of your ₹10,000 budget journey over 30 days</p>
        </div>
        <div className="feed-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={onRollShock} data-testid="feed-roll-shock-btn">
            Roll Surprise Life Event 🎲
          </button>
          <button className="btn btn-primary-mint btn-sm" onClick={onOpenAdd} data-testid="feed-add-tx-btn">
            + Log Transaction
          </button>
        </div>
      </div>

      <div className="feed-filters" role="group" data-testid="feed-filters">
        {['all', 'expense', 'income', 'food', 'bills', 'social'].map(f => (
          <button
            key={f}
            className={`filter-pill ${filter === f ? 'active' : ''}`}
            onClick={() => onFilterChange(f)}
            data-testid={`filter-${f}`}
          >
            {f === 'all' ? 'All' : f === 'expense' ? 'Expenses 💸' : f === 'income' ? 'Incomes 💰' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="transactions-feed" role="feed" data-testid="transactions-feed" data-category="spending">
        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
            No transactions found under this filter.
          </div>
        ) : (
          transactions.map(tx => (
            <div key={tx.id} className="tx-row" data-testid={`tx-${tx.id}`}>
              <div className="tx-left">
                <span className="tx-day-badge">DAY {tx.day}</span>
                <div className="tx-title-group">
                  <span className="tx-title">{tx.title}</span>
                  <span className="tx-note">{tx.note || tx.category}</span>
                </div>
              </div>
              <div className="tx-right">
                <span className={`tx-amount ${tx.type}`}>{tx.type === 'income' ? '+' : '-'}₹{formatINR(tx.amount)}</span>
                <button
                  className="tx-delete-btn"
                  title="Delete"
                  aria-label={`Delete ${tx.title}`}
                  onClick={() => onDeleteTransaction(tx.id)}
                  data-testid={`delete-tx-${tx.id}`}
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
