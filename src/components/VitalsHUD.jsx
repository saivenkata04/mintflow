import React from 'react';
import { formatINR } from '../utils.js';

export default function VitalsHUD({ computed }) {
  const balancePercentage = Math.max(0, Math.min(100, (computed.rawBalance / 10000) * 100));

  let scoreStrokeColor = '#00F5A0';
  if (computed.healthScore < 45) scoreStrokeColor = '#F43F5E';
  else if (computed.healthScore < 70) scoreStrokeColor = '#FBBF24';

  return (
    <section className="vitals-hud-grid" aria-label="Key Financial Metrics" data-testid="financial-vitals-hud">
      {/* Card 1: Live Balance */}
      <div className="hud-card" role="region" aria-labelledby="lbl-balance" data-testid="balance-card" data-category="balance">
        <div className="hud-card-header">
          <span className="hud-label" id="lbl-balance">Remaining Balance</span>
          <span className="hud-icon-badge" aria-hidden="true">💳</span>
        </div>
        <div className="hud-value-row">
          <span className="currency-symbol" aria-hidden="true">₹</span>
          <span className="hud-value" aria-live="polite" data-testid="balance-value">{formatINR(computed.rawBalance)}</span>
        </div>
        <div className="hud-sub-info">
          <span className="sub-tag" data-testid="income-baseline">₹10,000 Monthly Budget</span>
          <span className="hud-locked-note" data-testid="locked-commitments-note">₹{formatINR(computed.pendingCommitments)} locked for bills</span>
        </div>
        <div className="hud-progress-bar" role="progressbar" aria-valuenow={Math.round(balancePercentage)} aria-valuemin={0} aria-valuemax={100}>
          <div className="hud-progress-fill" style={{ width: `${balancePercentage}%` }}></div>
        </div>
      </div>

      {/* Card 2: Safe Daily Allowance */}
      <div className="hud-card highlight-mint" role="region" aria-labelledby="lbl-daily" data-testid="daily-allowance-card" data-category="daily-allowance">
        <div className="hud-card-header">
          <span className="hud-label" id="lbl-daily">Safe-to-Spend Daily</span>
          <span className="status-pill safe">Paced</span>
        </div>
        <div className="hud-value-row">
          <span className="currency-symbol" aria-hidden="true">₹</span>
          <span className="hud-value text-mint" aria-live="polite" data-testid="safe-daily-spend">{formatINR(computed.safeDailySpend)}</span>
          <span className="per-day">/ day</span>
        </div>
        <div className="hud-sub-info">
          <span>For the next {computed.daysRemaining} days</span>
          <span className="hud-burn-compare" data-testid="actual-burn-rate">Avg: ₹{formatINR(computed.actualAvgDailySpend)}/d</span>
        </div>
        <div className="hud-daily-pill-bar">
          <span className="hud-daily-tip">Spend under this today to preserve runway!</span>
        </div>
      </div>

      {/* Card 3: Financial Health Score */}
      <div className="hud-card" role="region" aria-labelledby="lbl-health" data-testid="financial-health-card" data-category="financial-health">
        <div className="hud-card-header">
          <span className="hud-label" id="lbl-health">Financial Health</span>
          <span className="vibe-emoji" aria-hidden="true">{computed.vibeMood.split(' ')[0]}</span>
        </div>
        <div className="hud-value-row score-row">
          <div className="circular-score-wrapper" role="img" aria-label={`Score: ${computed.healthScore}/100`}>
            <svg className="score-svg" viewBox="0 0 36 36" aria-hidden="true">
              <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path
                className="circle-fill"
                strokeDasharray={`${computed.healthScore}, 100`}
                style={{ stroke: scoreStrokeColor }}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="score-number" aria-live="polite" data-testid="health-score-value">{computed.healthScore}</span>
          </div>
          <div className="score-meta">
            <div className="vibe-title">{computed.vibeMood}</div>
            <div className="score-subtitle" data-testid="runway-days-status">Runway: {computed.runwayDays} Days</div>
          </div>
        </div>
      </div>

      {/* Card 4: Risk Radar */}
      <div className="hud-card" role="region" aria-labelledby="lbl-risk" data-testid="financial-risk-card" data-category="financial-risk">
        <div className="hud-card-header">
          <span className="hud-label" id="lbl-risk">Risk Radar & Runway</span>
          <span
            className={`risk-badge ${computed.riskLevel === 'HIGH_RISK' || computed.riskLevel === 'DEFICIT_IMMINENT' ? 'badge-danger' : computed.riskLevel === 'MODERATE_RISK' ? 'badge-amber' : ''}`}
            data-testid="risk-level-badge"
          >
            {computed.riskLabel}
          </span>
        </div>
        <div className="hud-value-row">
          <span className="hud-risk-forecast-title">Day 30 Finish:</span>
          <span
            className={`hud-forecast-amt ${computed.projectedEndOfMonthBalance < 0 ? 'text-rose' : 'text-mint'}`}
            aria-live="polite"
            data-testid="monthly-forecast-value"
          >
            {computed.projectedEndOfMonthBalance >= 0 ? '+' : ''}₹{formatINR(computed.projectedEndOfMonthBalance)}
          </span>
        </div>
        <div className="hud-sub-info">
          <span className="risk-desc">{computed.riskDescription}</span>
        </div>
      </div>
    </section>
  );
}
