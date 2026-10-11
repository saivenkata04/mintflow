import React from 'react';

export default function Navbar({
  currentDay,
  advisorTone,
  soundEnabled,
  onAdvanceDay,
  onSetTone,
  onToggleSound,
  onReset
}) {
  return (
    <header className="app-header" role="banner">
      <div className="header-container">
        <div className="brand-group">
          <div className="brand-logo" tabIndex={0}>
            <span className="logo-icon" aria-hidden="true">⚡</span>
            <span className="logo-title">MINTFLOW</span>
          </div>
          <span className="brand-badge" aria-label="10,000 rupees over 30 days">₹10K / 30-DAY LAB</span>
        </div>

        {/* Timeline Center Controls */}
        <div className="day-stepper-control" role="group" aria-label="Timeline navigation controls" data-testid="timeline-controls">
          <button className="icon-btn-round" aria-label="Step back one day" onClick={() => onAdvanceDay(-1)} data-testid="prev-day-btn">‹</button>
          <div className="day-indicator" role="status" aria-live="polite">
            <span className="day-glow-dot" aria-hidden="true"></span>
            <span className="day-label" data-testid="current-day-label">Day {currentDay}</span>
            <span className="day-sub">of 30 Days</span>
          </div>
          <button className="icon-btn-round" aria-label="Advance to next day" onClick={() => onAdvanceDay(1)} data-testid="next-day-btn">+1 D ›</button>
        </div>

        {/* Header Actions */}
        <div className="header-actions">
          <div className="tone-selector-wrap">
            <span className="tone-icon" aria-hidden="true">🤖</span>
            <select
              className="custom-select"
              value={advisorTone}
              onChange={(e) => onSetTone(e.target.value)}
              aria-label="AI Advisor Tone"
              data-testid="advisor-tone-select"
            >
              <option value="straight_talk">Straight Talk 🔥</option>
              <option value="gentle_bestie">Gentle Bestie 🌸</option>
              <option value="wall_street">Wall Street Bro 💼</option>
            </select>
          </div>

          <button
            className="icon-btn"
            title="Toggle Sound"
            aria-label="Toggle Sound"
            onClick={onToggleSound}
            data-testid="sound-toggle-btn"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>

          <button
            className="icon-btn"
            title="Reset Demo Data"
            aria-label="Reset State"
            onClick={onReset}
            data-testid="reset-state-btn"
          >
            🔄
          </button>
        </div>
      </div>
    </header>
  );
}
