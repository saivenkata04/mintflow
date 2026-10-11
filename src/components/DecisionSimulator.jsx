import React from 'react';
import { SIMULATION_PRESETS } from '../simulator.js';
import { formatINR } from '../utils.js';

export default function DecisionSimulator({
  simTitle,
  simAmount,
  simCategory,
  simType,
  activePresetIndex,
  onSelectPreset,
  onTitleChange,
  onAmountChange,
  onCategoryChange,
  onTypeChange,
  onSubmit
}) {
  return (
    <div className="card-box sim-controls-card" data-testid="sim-controls-card">
      <div className="section-header">
        <div>
          <h2 className="section-title">⚡ Before You Swipe: Decision Sandbox</h2>
          <p className="section-subtitle">Simulate any financial move and see exactly how it impacts your daily allowance, savings, and survival risk before spending a single rupee.</p>
        </div>
      </div>

      <div className="presets-section">
        <span className="control-label">Quick Gen Z Scenarios:</span>
        <div className="presets-grid" role="group" data-testid="presets-grid">
          {SIMULATION_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              className={`preset-chip ${activePresetIndex === idx ? 'active' : ''}`}
              onClick={() => onSelectPreset(p, idx)}
              data-testid={`preset-${p.id}`}
            >
              <span className="preset-title">{p.title}</span>
              <div className="preset-meta">
                <span className={`preset-amount ${p.type}`}>{p.type === 'income' ? '+' : '-'}₹{formatINR(p.amount)}</span>
                <span className="preset-tag">{p.tag}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="divider-text" aria-hidden="true"><span>OR BUILD CUSTOM SCENARIO</span></div>

      <form
        className="custom-sim-form"
        onSubmit={onSubmit}
        data-testid="decision-simulator-form"
        data-category="simulator"
      >
        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="sim-t">Decision Title</label>
            <input id="sim-t" type="text" value={simTitle} onChange={(e) => onTitleChange(e.target.value)} required data-testid="sim-title-input" />
          </div>
          <div className="form-group">
            <label htmlFor="sim-a">Amount (₹)</label>
            <input id="sim-a" type="number" min={10} max={50000} value={simAmount} onChange={(e) => onAmountChange(Number(e.target.value))} required data-testid="sim-amount-input" />
          </div>
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="sim-c">Category</label>
            <select id="sim-c" value={simCategory} onChange={(e) => onCategoryChange(e.target.value)} data-testid="sim-category-select">
              <option value="entertainment">Entertainment & Parties 🪩</option>
              <option value="food">Food & Late Night Binge 🍕</option>
              <option value="lifestyle">Shopping & Drip 👟</option>
              <option value="transit">Cab & Travel 🚗</option>
              <option value="essentials">Repairs & Study 📱</option>
              <option value="social">Friend Outings ☕</option>
              <option value="subscriptions">Subscriptions 🔄</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="sim-ty">Action Type</label>
            <select id="sim-ty" value={simType} onChange={(e) => onTypeChange(e.target.value)} data-testid="sim-type-select">
              <option value="expense">Outflow (Expense 💸)</option>
              <option value="income">Inflow (Side Gig / Paycheck 💰)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="sim-r">Quick Slider: <strong>₹{formatINR(simAmount)}</strong></label>
          <input
            id="sim-r"
            type="range"
            min={100}
            max={5000}
            step={50}
            value={Math.min(5000, Math.max(100, simAmount))}
            onChange={(e) => onAmountChange(Number(e.target.value))}
            className="styled-range"
            data-testid="sim-range-slider"
          />
        </div>
      </form>
    </div>
  );
}
