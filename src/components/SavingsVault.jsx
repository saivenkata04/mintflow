import React from 'react';
import { formatINR } from '../utils.js';

export default function SavingsVault({
  savingsGoals,
  totalSaved,
  onToggleLock,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenAdd
}) {
  return (
    <div className="card-box" data-testid="savings-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">🛡️ Savings Vault & Cushions</h2>
          <p className="section-subtitle">Protected funds to prevent debt shocks and build long-term Gen Z wealth</p>
        </div>
        <button className="btn btn-primary-mint btn-sm" onClick={onOpenAdd} data-testid="add-goal-btn">
          + New Savings Target
        </button>
      </div>

      <div className="savings-vault-hero">
        <div className="vault-shield-icon" aria-hidden="true">🛡️</div>
        <div className="vault-hero-info">
          <div className="vault-total-label">Total Cash Locked in Vault</div>
          <div className="vault-total-amount" data-testid="vault-locked-total">₹{formatINR(totalSaved)}</div>
          <p className="vault-hint">Locked cash is removed from your safe daily allowance so you never accidentally spend it on late-night takeout.</p>
        </div>
      </div>

      <div className="savings-grid" role="list" data-testid="savings-vault" data-category="savings-goals">
        {savingsGoals.map(goal => {
          const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
          return (
            <div key={goal.id} className="goal-card" role="listitem" data-testid={`goal-${goal.id}`}>
              <div className="goal-card-header">
                <span className="goal-title">{goal.title}</span>
                <button
                  className={`lock-shield-btn ${goal.isLocked ? 'locked' : ''}`}
                  onClick={() => onToggleLock(goal.id)}
                  data-testid={`lock-goal-${goal.id}`}
                  aria-label={`Toggle shield for ${goal.title}`}
                >
                  {goal.isLocked ? '🛡️ Locked' : '🔓 Unlocked'}
                </button>
              </div>
              <div className="goal-progress-wrap">
                <div className="goal-amt-row">
                  <span className="goal-current">₹{formatINR(goal.currentAmount)} saved</span>
                  <span className="goal-target">Target: ₹{formatINR(goal.targetAmount)} ({pct}%)</span>
                </div>
                <div className="goal-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${goal.title} progress`}>
                  <div className="goal-fill" style={{ width: `${pct}%` }}></div>
                </div>
              </div>
              <div className="goal-actions">
                <button
                  className="btn btn-outline-cyan btn-sm"
                  onClick={() => onOpenDeposit(goal)}
                  data-testid={`deposit-btn-${goal.id}`}
                >
                  + Deposit
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onOpenWithdraw(goal)}
                  data-testid={`withdraw-btn-${goal.id}`}
                >
                  - Withdraw
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
