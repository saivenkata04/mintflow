import React from 'react';
import { formatINR } from '../utils.js';

export default function RippleMatrix({
  comparison,
  verdict,
  advisorTone,
  onCommit,
  onDiscard
}) {
  const deltaBalSign = comparison.deltas.balance < 0 ? '-' : comparison.deltas.balance > 0 ? '+' : '';
  const deltaDailySign = comparison.deltas.safeDaily < 0 ? '-' : comparison.deltas.safeDaily > 0 ? '+' : '';
  const deltaHealthSign = comparison.deltas.health > 0 ? '+' : '';

  return (
    <div className="card-box sim-impact-card" data-testid="simulation-impact-card">
      <div className="sim-impact-header">
        <h3 className="section-title">Ripple Effect Matrix</h3>
        <span className="active-sim-badge" data-testid="sim-active-badge">Simulation Active</span>
      </div>

      <div className="matrix-grid" role="region" data-testid="ripple-effect-matrix">
        {/* Metric 1 */}
        <div className="matrix-tile">
          <div className="tile-header"><span>Remaining Balance</span><span>💳</span></div>
          <div className="tile-comparison">
            <div className="comp-col"><span className="col-lbl">Current</span><span className="col-val">₹{formatINR(comparison.baseline.rawBalance)}</span></div>
            <div className="comp-arrow">➔</div>
            <div className="comp-col"><span className="col-lbl">Simulated</span><span className="col-val font-bold">₹{formatINR(comparison.simulated.rawBalance)}</span></div>
          </div>
          <div className={`tile-delta ${comparison.deltas.balance >= 0 ? 'positive' : ''}`} data-testid="delta-balance">
            {deltaBalSign}₹{formatINR(Math.abs(comparison.deltas.balance))}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="matrix-tile highlight-tile">
          <div className="tile-header"><span>Safe Daily Allowance</span><span>🎯</span></div>
          <div className="tile-comparison">
            <div className="comp-col"><span className="col-lbl">Current</span><span className="col-val">₹{formatINR(comparison.baseline.safeDailySpend)}/d</span></div>
            <div className="comp-arrow">➔</div>
            <div className="comp-col"><span className="col-lbl">Simulated</span><span className="col-val font-bold text-mint">₹{formatINR(comparison.simulated.safeDailySpend)}/d</span></div>
          </div>
          <div className={`tile-delta ${comparison.deltas.safeDaily >= 0 ? 'positive' : ''}`} data-testid="delta-daily">
            {deltaDailySign}₹{formatINR(Math.abs(comparison.deltas.safeDaily))}/d for {comparison.baseline.daysRemaining} days
          </div>
        </div>

        {/* Metric 3 */}
        <div className="matrix-tile">
          <div className="tile-header"><span>Health Score</span><span>⚡</span></div>
          <div className="tile-comparison">
            <div className="comp-col"><span className="col-lbl">Current</span><span className="col-val">{comparison.baseline.healthScore} pts</span></div>
            <div className="comp-arrow">➔</div>
            <div className="comp-col"><span className="col-lbl">Simulated</span><span className="col-val font-bold">{comparison.simulated.healthScore} pts</span></div>
          </div>
          <div className={`tile-delta ${comparison.deltas.health >= 0 ? 'positive' : ''}`} data-testid="delta-health">
            {deltaHealthSign}{comparison.deltas.health} pts
          </div>
        </div>

        {/* Metric 4 */}
        <div className="matrix-tile">
          <div className="tile-header"><span>Day 30 Finish</span><span>🏁</span></div>
          <div className="tile-comparison">
            <div className="comp-col"><span className="col-lbl">Current</span><span className="col-val">₹{formatINR(comparison.baseline.projectedEndOfMonthBalance)}</span></div>
            <div className="comp-arrow">➔</div>
            <div className="comp-col"><span className="col-lbl">Simulated</span><span className="col-val font-bold">₹{formatINR(comparison.simulated.projectedEndOfMonthBalance)}</span></div>
          </div>
          <div className={`tile-delta ${comparison.simulated.projectedEndOfMonthBalance >= 0 ? 'positive' : ''}`} data-testid="delta-finish">
            {comparison.simulated.projectedEndOfMonthBalance < 0 ? 'Risk of Deficit' : `+₹${formatINR(comparison.deltas.endOfMonth)} net swing`}
          </div>
        </div>
      </div>

      {/* AI Advisor Box */}
      <div className={`advisor-verdict-box ${verdict.verdictClass}`} role="region" aria-live="polite" data-testid="advisor-verdict-box">
        <div className="advisor-header">
          <span className="advisor-avatar">🤖</span>
          <div className="advisor-meta">
            <strong className="advisor-name">MintFlow Reality Check</strong>
            <span className="advisor-tag">
              {advisorTone === 'gentle_bestie' ? 'Gentle Bestie 🌸' : advisorTone === 'wall_street' ? 'Wall Street 💼' : 'Straight Talk 🔥'}
            </span>
          </div>
        </div>
        <div className="advisor-headline" data-testid="advisor-headline">{verdict.headline}</div>
        <p className="advisor-analysis" data-testid="advisor-analysis">{verdict.analysis}</p>
        <div className="advisor-recommendation" data-testid="advisor-recommendation">💡 <strong>Smart Counter-move:</strong> {verdict.recommendation}</div>
      </div>

      <div className="sim-commit-buttons">
        <button className="btn btn-primary-mint btn-lg" onClick={onCommit} data-testid="commit-decision-btn">
          ✅ Commit Decision to Ledger
        </button>
        <button className="btn btn-ghost btn-lg" onClick={onDiscard} data-testid="discard-sim-btn">
          ❌ Discard Simulation
        </button>
      </div>
    </div>
  );
}
