import React from 'react';
import { formatINR } from '../utils.js';

export default function CommitmentsVault({
  commitments,
  pendingTotal,
  onToggleCommitment,
  onPayCommitment,
  onOpenAdd
}) {
  const totalAll = commitments.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="card-box" data-testid="commitments-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">📑 Commitments & Subscriptions Vault</h2>
          <p className="section-subtitle">Fixed monthly obligations that automatically lock cash from your ₹10,000 budget</p>
        </div>
        <button className="btn btn-primary-mint btn-sm" onClick={onOpenAdd} data-testid="add-commitment-btn">
          + Add Bill / Subscription
        </button>
      </div>

      <div className="commitments-summary-bar">
        <div className="comm-stat"><span className="stat-lbl">Total Fixed Commitments:</span><strong className="stat-val">₹{formatINR(totalAll)}</strong></div>
        <div className="comm-stat"><span className="stat-lbl">Remaining Unpaid:</span><strong className="stat-val text-amber">₹{formatINR(pendingTotal)}</strong></div>
        <div className="comm-stat"><span className="stat-lbl">Daily Runway Cost:</span><strong className="stat-val text-cyan">~₹{formatINR(Math.round(totalAll / 30))}/day</strong></div>
      </div>

      <div className="commitments-grid" role="list" data-testid="commitments-vault" data-category="commitments">
        {commitments.map(c => (
          <div key={c.id} className={`comm-card ${!c.active ? 'paused' : ''}`} role="listitem" data-testid={`commitment-${c.id}`}>
            <div className="comm-header">
              <span className="comm-title">{c.title}</span>
              <span className={`comm-due-tag ${c.paid ? 'paid' : ''}`}>
                {c.paid ? 'PAID' : `DUE DAY ${c.dueDay}`}
              </span>
            </div>
            <div className="comm-body">
              <span className="comm-amount">₹{formatINR(c.amount)}</span>
              <span className="comm-daily-slice">Locks ~₹{formatINR(Math.round(c.amount / 30))}/day</span>
            </div>
            <div className="comm-footer">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onToggleCommitment(c.id)}
                data-testid={`toggle-commitment-${c.id}`}
              >
                {c.active ? 'Pause / Cancel' : 'Resume Bill'}
              </button>
              {!c.paid && c.active && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onPayCommitment(c.id)}
                  data-testid={`pay-commitment-${c.id}`}
                >
                  Pay Early
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
