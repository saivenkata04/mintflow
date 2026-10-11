import React, { useState, useEffect, useRef } from 'react';
import { store } from './state.js';
import { SIMULATION_PRESETS, generateAdvisorVerdict } from './simulator.js';
import { sound } from './audio.js';
import { getRandomLifeEvent } from './events.js';
import { formatINR } from './utils.js';
import confetti from 'canvas-confetti';

export default function App() {
  const [state, setState] = useState(() => store.state);
  const [computed, setComputed] = useState(() => store.getComputedMetrics());
  const [activeTab, setActiveTab] = useState('tab-dashboard');
  
  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'tx' | 'com' | 'goal' | 'shock' | 'savingsAction'
  const [activeShock, setActiveShock] = useState(null);
  const [savingsActionData, setSavingsActionData] = useState({ goal: null, type: 'deposit', amount: 200 });
  const [feedFilter, setFeedFilter] = useState('all');
  const [activePresetIndex, setActivePresetIndex] = useState(0);

  // Forms state
  const [simTitle, setSimTitle] = useState('Weekend Concert Pass');
  const [simAmount, setSimAmount] = useState(1400);
  const [simCategory, setSimCategory] = useState('entertainment');
  const [simType, setSimType] = useState('expense');

  const [toasts, setToasts] = useState([]);

  const canvasRef = useRef(null);

  // Toast helper
  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  };

  // Subscribe to store
  useEffect(() => {
    const unsubscribe = store.subscribe((newState, newComputed) => {
      setState({ ...newState });
      setComputed({ ...newComputed });
    });
    return () => unsubscribe();
  }, []);

  // Update simulation in store when inputs change
  useEffect(() => {
    store.setSimulation({
      active: true,
      title: simTitle,
      amount: simAmount,
      category: simCategory,
      type: simType
    });
  }, [simTitle, simAmount, simCategory, simType]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeModal) {
        setActiveModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal]);

  // Canvas drawing for 30-Day forecast trajectory
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeTab !== 'tab-dashboard') return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const comparison = store.getSimulationComparison();
    const { baseline, simulated } = comparison;

    const padding = { left: 55, right: 25, top: 25, bottom: 35 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxVal = 10500;
    const minVal = 0;

    const getX = (day) => padding.left + ((day - 1) / 29) * chartWidth;
    const getY = (val) => padding.top + (1 - (val - minVal) / (maxVal - minVal)) * chartHeight;

    // Grid lines & labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.fillStyle = 'rgba(160, 174, 192, 0.6)';
    ctx.font = '11px "Space Grotesk", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const gridSteps = [0, 2500, 5000, 7500, 10000];
    gridSteps.forEach(v => {
      const y = getY(v);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(`₹${(v / 1000).toFixed(v === 0 ? 0 : 1)}k`, padding.left - 10, y);
    });

    // X Labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const dayLabels = [1, 5, 10, 15, 20, 25, 30];
    dayLabels.forEach(d => {
      const x = getX(d);
      ctx.fillText(`D${d}`, x, height - padding.bottom + 10);
    });

    // Commitment due vertical markers
    state.commitments.forEach(c => {
      if (c.active && c.dueDay >= 1 && c.dueDay <= 30) {
        const x = getX(c.dueDay);
        ctx.strokeStyle = c.dueDay <= baseline.currentDay ? 'rgba(74, 222, 128, 0.2)' : 'rgba(244, 63, 94, 0.35)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = c.dueDay <= baseline.currentDay ? '#10B981' : '#F43F5E';
        ctx.beginPath();
        ctx.arc(x, padding.top + 6, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 1. SAFE PATH TRAJECTORY
    ctx.beginPath();
    ctx.strokeStyle = '#00F5A0';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);

    for (let d = 1; d <= 30; d++) {
      let val;
      if (d <= baseline.currentDay) {
        val = 10000 - (10000 - baseline.rawBalance) * ((d - 1) / Math.max(1, baseline.currentDay - 1));
      } else {
        const remainingSteps = d - baseline.currentDay;
        val = baseline.rawBalance - (baseline.safeDailySpend * remainingSteps);
      }
      val = Math.max(0, val);
      const x = getX(d);
      const y = getY(val);
      if (d === 1) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 2. SIMULATED WHAT-IF PATH
    if (simulated) {
      ctx.beginPath();
      ctx.strokeStyle = '#F97316';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);

      for (let d = baseline.currentDay; d <= 30; d++) {
        const remainingSteps = d - baseline.currentDay;
        let val = simulated.rawBalance - (simulated.safeDailySpend * remainingSteps);
        val = Math.max(0, val);
        const x = getX(d);
        const y = getY(val);
        if (d === baseline.currentDay) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Highlight TODAY
    const todayX = getX(baseline.currentDay);
    const todayY = getY(baseline.rawBalance);

    ctx.strokeStyle = 'rgba(0, 245, 160, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(todayX, padding.top);
    ctx.lineTo(todayX, height - padding.bottom);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 245, 160, 0.25)';
    ctx.beginPath();
    ctx.arc(todayX, todayY, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00F5A0';
    ctx.beginPath();
    ctx.arc(todayX, todayY, 5, 0, Math.PI * 2);
    ctx.fill();
  }, [state, computed, activeTab]);

  // Actions
  const handleAdvanceDay = (by = 1) => {
    sound.playClick();
    const prev = state.currentDay;
    store.advanceDay(by);
    const next = store.state.currentDay;
    if (next === 30 && prev < 30) {
      sound.playSuccess();
      confetti({ particleCount: 100, spread: 100, origin: { y: 0.5 } });
      showToast('🎉 Day 30 Reached! You survived the month!', 'success');
    } else {
      showToast(`Advanced to Day ${next} of 30`, 'info');
    }
  };

  const handleSelectPreset = (preset, idx) => {
    sound.playClick();
    setActivePresetIndex(idx);
    setSimTitle(preset.title);
    setSimAmount(preset.amount);
    setSimCategory(preset.category);
    setSimType(preset.type);
  };

  const handleCommitDecision = () => {
    const comparison = store.getSimulationComparison();
    store.commitSimulation();
    if (simType === 'income') {
      sound.playSuccess();
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      showToast(`Committed! Boosted runway by +₹${formatINR(simAmount)}`, 'success');
    } else {
      if (comparison.simulated.healthScore < 50) {
        sound.playWarning();
        showToast(`Committed! Watch out: Daily allowance is now ₹${formatINR(comparison.simulated.safeDailySpend)}/d`, 'warning');
      } else {
        sound.playClick();
        showToast(`Decision committed: ₹${formatINR(simAmount)} logged to Day ${state.currentDay}`, 'info');
      }
    }
  };

  const handleRollShock = () => {
    sound.playWarning();
    const event = getRandomLifeEvent();
    setActiveShock(event);
    setActiveModal('shock');
  };

  const handleAcceptShock = () => {
    if (!activeShock) return;
    store.addTransaction({
      day: state.currentDay,
      title: `[Shock Event] ${activeShock.title}`,
      amount: activeShock.amount,
      category: activeShock.category,
      type: activeShock.type,
      note: activeShock.description
    });
    if (activeShock.type === 'income') {
      sound.playCoin();
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      showToast(`+₹${formatINR(activeShock.amount)} added to balance!`, 'success');
    } else {
      sound.playWarning();
      showToast(`-₹${formatINR(activeShock.amount)} deducted from runway!`, 'danger');
    }
    setActiveModal(null);
    setActiveShock(null);
  };

  const comparison = store.getSimulationComparison();
  const verdict = generateAdvisorVerdict(comparison, state.simulation, state.settings.advisorTone);

  // Filtered transactions
  let filteredTxs = state.transactions;
  if (feedFilter === 'expense') filteredTxs = state.transactions.filter(t => t.type === 'expense');
  else if (feedFilter === 'income') filteredTxs = state.transactions.filter(t => t.type === 'income');
  else if (feedFilter !== 'all') filteredTxs = state.transactions.filter(t => t.category === feedFilter);

  // Next bill alert calculation
  const nextBill = state.commitments
    .filter(c => c.active && !c.paid && c.dueDay >= state.currentDay)
    .sort((a, b) => a.dueDay - b.dueDay)[0];

  return (
    <div className="dark-theme app-container">
      {/* Ambient background glow */}
      <div className="ambient-glow glow-1" aria-hidden="true"></div>
      <div className="ambient-glow glow-2" aria-hidden="true"></div>

      {/* Header */}
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
          <div className="day-stepper-control" role="group" aria-label="Timeline navigation controls">
            <button className="icon-btn-round" aria-label="Step back one day" onClick={() => handleAdvanceDay(-1)}>‹</button>
            <div className="day-indicator" role="status" aria-live="polite">
              <span className="day-glow-dot" aria-hidden="true"></span>
              <span className="day-label">Day {computed.currentDay}</span>
              <span className="day-sub">of 30 Days</span>
            </div>
            <button className="icon-btn-round" aria-label="Advance to next day" onClick={() => handleAdvanceDay(1)}>+1 D ›</button>
          </div>

          {/* Header Actions */}
          <div className="header-actions">
            <div className="tone-selector-wrap">
              <span className="tone-icon" aria-hidden="true">🤖</span>
              <select
                className="custom-select"
                value={state.settings.advisorTone}
                onChange={(e) => {
                  store.setAdvisorTone(e.target.value);
                  sound.playClick();
                }}
                aria-label="AI Advisor Tone"
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
              onClick={() => {
                const en = store.toggleSound();
                sound.setEnabled(en);
                showToast(en ? 'Tactile Audio Enabled' : 'Audio Muted', 'info');
              }}
            >
              {state.settings.soundEnabled ? '🔊' : '🔇'}
            </button>

            <button
              className="icon-btn"
              title="Reset Demo Data"
              aria-label="Reset State"
              onClick={() => {
                if (confirm('Reset budget simulation back to Day 6 starting state?')) {
                  store.resetToDefault();
                  sound.playCoin();
                  showToast('Demo state restored!', 'info');
                }
              }}
            >
              🔄
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="app-main" id="main-content">
        
        {/* TOP HUD: FINANCIAL VITALS */}
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
            <div className="hud-progress-bar" role="progressbar" aria-valuenow={Math.round((computed.rawBalance / 10000) * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="hud-progress-fill" style={{ width: `${Math.max(0, Math.min(100, (computed.rawBalance / 10000) * 100))}%` }}></div>
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
                    style={{ stroke: computed.healthScore < 45 ? '#F43F5E' : computed.healthScore < 70 ? '#FBBF24' : '#00F5A0' }}
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

        {/* NAVIGATION TABS */}
        <nav className="app-tabs-nav" role="tablist" aria-label="Main Application Views">
          <button
            className={`tab-btn ${activeTab === 'tab-dashboard' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'tab-dashboard'}
            onClick={() => { sound.playClick(); setActiveTab('tab-dashboard'); }}
            data-testid="tab-dashboard"
          >
            <span className="tab-icon" aria-hidden="true">📊</span>
            <span className="tab-text">Overview & Forecast</span>
          </button>
          <button
            className={`tab-btn highlight-tab ${activeTab === 'tab-simulator' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'tab-simulator'}
            onClick={() => { sound.playClick(); setActiveTab('tab-simulator'); }}
            data-testid="tab-simulator"
          >
            <span className="tab-icon" aria-hidden="true">⚡</span>
            <span className="tab-text">Decision Simulator</span>
            <span className="tab-pulse-badge" aria-hidden="true">What-If</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'tab-commitments' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'tab-commitments'}
            onClick={() => { sound.playClick(); setActiveTab('tab-commitments'); }}
            data-testid="tab-commitments"
          >
            <span className="tab-icon" aria-hidden="true">📑</span>
            <span className="tab-text">Bills & Subscriptions</span>
            <span className="tab-count-badge">{state.commitments.length}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'tab-savings' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'tab-savings'}
            onClick={() => { sound.playClick(); setActiveTab('tab-savings'); }}
            data-testid="tab-savings"
          >
            <span className="tab-icon" aria-hidden="true">🛡️</span>
            <span className="tab-text">Savings Vault</span>
            <span className="tab-count-badge">{state.savingsGoals.length}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'tab-feed' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'tab-feed'}
            onClick={() => { sound.playClick(); setActiveTab('tab-feed'); }}
            data-testid="tab-feed"
          >
            <span className="tab-icon" aria-hidden="true">📜</span>
            <span className="tab-text">Transactions & Shocks</span>
          </button>
        </nav>

        {/* TAB 1: OVERVIEW & FORECAST */}
        {activeTab === 'tab-dashboard' && (
          <section className="tab-panel active" role="tabpanel" tabIndex={0}>
            <div className="dashboard-grid">
              <div className="chart-section card-box">
                <div className="section-header">
                  <div>
                    <h2 className="section-title">30-Day Cashflow Trajectory Forecast</h2>
                    <p className="section-subtitle">Real-time simulation of safe path vs actual spend vs upcoming bill impacts</p>
                  </div>
                  <div className="chart-legend" aria-label="Chart legend">
                    <span className="legend-item"><span className="legend-dot safe" aria-hidden="true"></span> Safe Path</span>
                    <span className="legend-item"><span className="legend-dot sim" aria-hidden="true"></span> What-If Path</span>
                    <span className="legend-item"><span className="legend-dot bill" aria-hidden="true"></span> Bill Due Day</span>
                  </div>
                </div>

                <div className="canvas-wrapper">
                  <canvas ref={canvasRef} width={800} height={300} role="img" aria-label="30-day balance trajectory chart"></canvas>
                </div>

                <div className="timeline-scrubber-card">
                  <div className="scrubber-header">
                    <span className="scrubber-title">⏱️ 30-Day Budget Timeline</span>
                    <div className="timeline-quick-actions">
                      <button className="btn btn-primary-mint btn-sm" onClick={() => handleAdvanceDay(1)}>
                        Advance +1 Day ›
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={handleRollShock}>
                        Roll Life Shock 🎲
                      </button>
                    </div>
                  </div>
                  <div className="range-slider-wrap">
                    <label htmlFor="day-range" className="sr-only">Timeline slider</label>
                    <input
                      id="day-range"
                      type="range"
                      min={1}
                      max={30}
                      value={state.currentDay}
                      onChange={(e) => store.setCurrentDay(Number(e.target.value))}
                      className="day-slider"
                      aria-label="Timeline day selector"
                    />
                    <div className="slider-ticks" aria-hidden="true">
                      <span>D1</span><span>D5</span><span>D10</span><span>D15</span><span>D20</span><span>D25</span><span>D30</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar allocation */}
              <div className="sidebar-metrics card-box">
                <h3 className="section-title">Budget Allocation</h3>
                <p className="section-subtitle">How your ₹10,000 is distributed right now</p>

                <div className="distribution-bars">
                  <div className="dist-row">
                    <div className="dist-info"><span>Spent so far</span><strong>₹{formatINR(computed.totalSpent)}</strong></div>
                    <div className="dist-track"><div className="dist-fill fill-spent" style={{ width: `${Math.min(100, (computed.totalSpent / 10000) * 100)}%` }}></div></div>
                  </div>
                  <div className="dist-row">
                    <div className="dist-info"><span>Upcoming Bills</span><strong>₹{formatINR(computed.pendingCommitments)}</strong></div>
                    <div className="dist-track"><div className="dist-fill fill-bills" style={{ width: `${Math.min(100, (computed.pendingCommitments / 10000) * 100)}%` }}></div></div>
                  </div>
                  <div className="dist-row">
                    <div className="dist-info"><span>Locked Savings</span><strong>₹{formatINR(computed.totalSavingsSaved)}</strong></div>
                    <div className="dist-track"><div className="dist-fill fill-savings" style={{ width: `${Math.min(100, (computed.totalSavingsSaved / 10000) * 100)}%` }}></div></div>
                  </div>
                  <div className="dist-row">
                    <div className="dist-info"><span>Free Safe Runway</span><strong className="text-mint">₹{formatINR(computed.liquidBuffer)}</strong></div>
                    <div className="dist-track"><div className="dist-fill fill-runway" style={{ width: `${Math.max(0, 100 - ((computed.totalSpent + computed.pendingCommitments + computed.totalSavingsSaved) / 10000) * 100)}%` }}></div></div>
                  </div>
                </div>

                <div className="quick-action-dock">
                  <button className="btn btn-primary-mint w-full" onClick={() => setActiveModal('tx')}>+ Log Expense / Income</button>
                  <button className="btn btn-outline-cyan w-full" onClick={() => { sound.playClick(); setActiveTab('tab-simulator'); }}>⚡ Test What-If Splurge</button>
                </div>

                {nextBill && (
                  <div className="upcoming-bill-alert" role="status">
                    <div className="alert-bell" aria-hidden="true">🔔</div>
                    <div className="alert-content">
                      <div className="alert-title">{nextBill.dueDay === state.currentDay ? '⚡ Bill Due Today!' : `Next Bill in ${nextBill.dueDay - state.currentDay} Days`}</div>
                      <div className="alert-sub">Day {nextBill.dueDay} • {nextBill.title} (₹{formatINR(nextBill.amount)})</div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        sound.playCoin();
                        store.payCommitment(nextBill.id);
                        showToast(`Paid ${nextBill.title} early!`, 'success');
                      }}
                    >
                      Pay Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: "BEFORE YOU SWIPE" SIMULATOR */}
        {activeTab === 'tab-simulator' && (
          <section className="tab-panel active" role="tabpanel" tabIndex={0}>
            <div className="simulator-layout">
              <div className="card-box sim-controls-card">
                <div className="section-header">
                  <div>
                    <h2 className="section-title">⚡ Before You Swipe: Decision Sandbox</h2>
                    <p className="section-subtitle">Simulate any financial move and see exactly how it impacts your daily allowance, savings, and survival risk before spending a single rupee.</p>
                  </div>
                </div>

                <div className="presets-section">
                  <span className="control-label">Quick Gen Z Scenarios:</span>
                  <div className="presets-grid" role="group">
                    {SIMULATION_PRESETS.map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`preset-chip ${activePresetIndex === idx ? 'active' : ''}`}
                        onClick={() => handleSelectPreset(p, idx)}
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
                  onSubmit={(e) => { e.preventDefault(); sound.playClick(); showToast('Simulation refreshed!', 'info'); }}
                  data-testid="decision-simulator-form"
                  data-category="simulator"
                >
                  <div className="form-row-2">
                    <div className="form-group">
                      <label htmlFor="sim-t">Decision Title</label>
                      <input id="sim-t" type="text" value={simTitle} onChange={(e) => setSimTitle(e.target.value)} required data-testid="sim-title-input" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="sim-a">Amount (₹)</label>
                      <input id="sim-a" type="number" min={10} max={50000} value={simAmount} onChange={(e) => setSimAmount(Number(e.target.value))} required data-testid="sim-amount-input" />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label htmlFor="sim-c">Category</label>
                      <select id="sim-c" value={simCategory} onChange={(e) => setSimCategory(e.target.value)} data-testid="sim-category-select">
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
                      <select id="sim-ty" value={simType} onChange={(e) => setSimType(e.target.value)} data-testid="sim-type-select">
                        <option value="expense">Outflow (Expense 💸)</option>
                        <option value="income">Inflow (Side Gig / Paycheck 💰)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="sim-r">Quick Slider: <strong>₹{formatINR(simAmount)}</strong></label>
                    <input id="sim-r" type="range" min={100} max={5000} step={50} value={Math.min(5000, Math.max(100, simAmount))} onChange={(e) => setSimAmount(Number(e.target.value))} className="styled-range" data-testid="sim-range-slider" />
                  </div>
                </form>
              </div>

              {/* Matrix and Verdict */}
              <div className="card-box sim-impact-card" data-testid="simulation-impact-card">
                <div className="sim-impact-header">
                  <h3 className="section-title">Ripple Effect Matrix</h3>
                  <span className="active-sim-badge" data-testid="sim-active-badge">Simulation Active</span>
                </div>

                <div className="matrix-grid" role="region" data-testid="ripple-effect-matrix">
                  <div className="matrix-tile">
                    <div className="tile-header"><span>Remaining Balance</span><span>💳</span></div>
                    <div className="tile-comparison">
                      <div className="comp-col"><span className="col-lbl">Current</span><span className="col-val">₹{formatINR(comparison.baseline.rawBalance)}</span></div>
                      <div className="comp-arrow">➔</div>
                      <div className="comp-col"><span className="col-lbl">Simulated</span><span className="col-val font-bold">₹{formatINR(comparison.simulated.rawBalance)}</span></div>
                    </div>
                    <div className={`tile-delta ${comparison.deltas.balance >= 0 ? 'positive' : ''}`}>
                      {comparison.deltas.balance > 0 ? '+' : ''}₹{formatINR(comparison.deltas.balance)}
                    </div>
                  </div>

                  <div className="matrix-tile highlight-tile">
                    <div className="tile-header"><span>Safe Daily Allowance</span><span>🎯</span></div>
                    <div className="tile-comparison">
                      <div className="comp-col"><span className="col-lbl">Current</span><span className="col-val">₹{formatINR(comparison.baseline.safeDailySpend)}/d</span></div>
                      <div className="comp-arrow">➔</div>
                      <div className="comp-col"><span className="col-lbl">Simulated</span><span className="col-val font-bold text-mint">₹{formatINR(comparison.simulated.safeDailySpend)}/d</span></div>
                    </div>
                    <div className={`tile-delta ${comparison.deltas.safeDaily >= 0 ? 'positive' : ''}`}>
                      {comparison.deltas.safeDaily > 0 ? '+' : ''}₹{formatINR(comparison.deltas.safeDaily)}/d for {comparison.baseline.daysRemaining} days
                    </div>
                  </div>

                  <div className="matrix-tile">
                    <div className="tile-header"><span>Health Score</span><span>⚡</span></div>
                    <div className="tile-comparison">
                      <div className="comp-col"><span className="col-lbl">Current</span><span className="col-val">{comparison.baseline.healthScore} pts</span></div>
                      <div className="comp-arrow">➔</div>
                      <div className="comp-col"><span className="col-lbl">Simulated</span><span className="col-val font-bold">{comparison.simulated.healthScore} pts</span></div>
                    </div>
                    <div className={`tile-delta ${comparison.deltas.health >= 0 ? 'positive' : ''}`}>
                      {comparison.deltas.health > 0 ? '+' : ''}{comparison.deltas.health} pts
                    </div>
                  </div>

                  <div className="matrix-tile">
                    <div className="tile-header"><span>Day 30 Finish</span><span>🏁</span></div>
                    <div className="tile-comparison">
                      <div className="comp-col"><span className="col-lbl">Current</span><span className="col-val">₹{formatINR(comparison.baseline.projectedEndOfMonthBalance)}</span></div>
                      <div className="comp-arrow">➔</div>
                      <div className="comp-col"><span className="col-lbl">Simulated</span><span className="col-val font-bold">₹{formatINR(comparison.simulated.projectedEndOfMonthBalance)}</span></div>
                    </div>
                    <div className={`tile-delta ${comparison.simulated.projectedEndOfMonthBalance >= 0 ? 'positive' : ''}`}>
                      {comparison.simulated.projectedEndOfMonthBalance < 0 ? 'Risk of Deficit' : `+₹${formatINR(comparison.deltas.endOfMonth)} net swing`}
                    </div>
                  </div>
                </div>

                <div className={`advisor-verdict-box ${verdict.verdictClass}`} role="region" aria-live="polite">
                  <div className="advisor-header">
                    <span className="advisor-avatar">🤖</span>
                    <div className="advisor-meta">
                      <strong className="advisor-name">MintFlow Reality Check</strong>
                      <span className="advisor-tag">
                        {state.settings.advisorTone === 'gentle_bestie' ? 'Gentle Bestie 🌸' : state.settings.advisorTone === 'wall_street' ? 'Wall Street 💼' : 'Straight Talk 🔥'}
                      </span>
                    </div>
                  </div>
                  <div className="advisor-headline">{verdict.headline}</div>
                  <p className="advisor-analysis">{verdict.analysis}</p>
                  <div className="advisor-recommendation">💡 <strong>Smart Counter-move:</strong> {verdict.recommendation}</div>
                </div>

                <div className="sim-commit-buttons">
                  <button className="btn btn-primary-mint btn-lg" onClick={handleCommitDecision}>
                    ✅ Commit Decision to Ledger
                  </button>
                  <button
                    className="btn btn-ghost btn-lg"
                    onClick={() => {
                      sound.playClick();
                      store.discardSimulation();
                      showToast('Simulation discarded. Back to real baseline.', 'info');
                    }}
                  >
                    ❌ Discard Simulation
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: COMMITMENTS */}
        {activeTab === 'tab-commitments' && (
          <section className="tab-panel active" role="tabpanel" tabIndex={0}>
            <div className="card-box">
              <div className="section-header">
                <div>
                  <h2 className="section-title">📑 Commitments & Subscriptions Vault</h2>
                  <p className="section-subtitle">Fixed monthly obligations that automatically lock cash from your ₹10,000 budget</p>
                </div>
                <button className="btn btn-primary-mint btn-sm" onClick={() => setActiveModal('com')}>
                  + Add Bill / Subscription
                </button>
              </div>

              <div className="commitments-summary-bar">
                <div className="comm-stat"><span className="stat-lbl">Total Fixed Commitments:</span><strong className="stat-val">₹{formatINR(state.commitments.reduce((s, c) => s + c.amount, 0))}</strong></div>
                <div className="comm-stat"><span className="stat-lbl">Remaining Unpaid:</span><strong className="stat-val text-amber">₹{formatINR(computed.pendingCommitments)}</strong></div>
                <div className="comm-stat"><span className="stat-lbl">Daily Runway Cost:</span><strong className="stat-val text-cyan">~₹{formatINR(Math.round(state.commitments.reduce((s, c) => s + c.amount, 0) / 30))}/day</strong></div>
              </div>

              <div className="commitments-grid" role="list" data-testid="commitments-vault" data-category="commitments">
                {state.commitments.map(c => (
                  <div key={c.id} className={`comm-card ${!c.active ? 'paused' : ''}`} role="listitem">
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
                        onClick={() => {
                          sound.playClick();
                          store.toggleCommitment(c.id);
                          showToast(c.active ? `Paused ${c.title}` : `Resumed ${c.title}`, 'info');
                        }}
                      >
                        {c.active ? 'Pause / Cancel' : 'Resume Bill'}
                      </button>
                      {!c.paid && c.active && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            sound.playCoin();
                            store.payCommitment(c.id);
                            showToast(`Paid ${c.title} early!`, 'success');
                          }}
                        >
                          Pay Early
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: SAVINGS VAULT */}
        {activeTab === 'tab-savings' && (
          <section className="tab-panel active" role="tabpanel" tabIndex={0}>
            <div className="card-box">
              <div className="section-header">
                <div>
                  <h2 className="section-title">🛡️ Savings Vault & Cushions</h2>
                  <p className="section-subtitle">Protected funds to prevent debt shocks and build long-term Gen Z wealth</p>
                </div>
                <button className="btn btn-primary-mint btn-sm" onClick={() => setActiveModal('goal')}>
                  + New Savings Target
                </button>
              </div>

              <div className="savings-vault-hero">
                <div className="vault-shield-icon" aria-hidden="true">🛡️</div>
                <div className="vault-hero-info">
                  <div className="vault-total-label">Total Cash Locked in Vault</div>
                  <div className="vault-total-amount">₹{formatINR(computed.totalSavingsSaved)}</div>
                  <p className="vault-hint">Locked cash is removed from your safe daily allowance so you never accidentally spend it on late-night takeout.</p>
                </div>
              </div>

              <div className="savings-grid" role="list" data-testid="savings-vault" data-category="savings-goals">
                {state.savingsGoals.map(goal => {
                  const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                  return (
                    <div key={goal.id} className="goal-card" role="listitem">
                      <div className="goal-card-header">
                        <span className="goal-title">{goal.title}</span>
                        <button
                          className={`lock-shield-btn ${goal.isLocked ? 'locked' : ''}`}
                          onClick={() => {
                            sound.playClick();
                            store.toggleSavingsLock(goal.id);
                            showToast(goal.isLocked ? `Unlocked ${goal.title}` : `Shield activated for ${goal.title}`, 'info');
                          }}
                        >
                          {goal.isLocked ? '🛡️ Locked' : '🔓 Unlocked'}
                        </button>
                      </div>
                      <div className="goal-progress-wrap">
                        <div className="goal-amt-row">
                          <span className="goal-current">₹{formatINR(goal.currentAmount)} saved</span>
                          <span className="goal-target">Target: ₹{formatINR(goal.targetAmount)} ({pct}%)</span>
                        </div>
                        <div className="goal-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                          <div className="goal-fill" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                      <div className="goal-actions">
                        <button
                          className="btn btn-outline-cyan btn-sm"
                          onClick={() => {
                            setSavingsActionData({ goal, type: 'deposit', amount: 200 });
                            setActiveModal('savingsAction');
                          }}
                        >
                          + Deposit
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            if (goal.isLocked && !confirm(`⚠️ Shield Alert: ${goal.title} is locked! Are you sure?`)) return;
                            setSavingsActionData({ goal, type: 'withdraw', amount: Math.min(goal.currentAmount, 200) });
                            setActiveModal('savingsAction');
                          }}
                        >
                          - Withdraw
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* TAB 5: TRANSACTIONS & FEED */}
        {activeTab === 'tab-feed' && (
          <section className="tab-panel active" role="tabpanel" tabIndex={0}>
            <div className="card-box">
              <div className="section-header">
                <div>
                  <h2 className="section-title">📜 Transactions & Surprise Life Feed</h2>
                  <p className="section-subtitle">Complete ledger of your ₹10,000 budget journey over 30 days</p>
                </div>
                <div className="feed-header-actions">
                  <button className="btn btn-secondary btn-sm" onClick={handleRollShock}>
                    Roll Surprise Life Event 🎲
                  </button>
                  <button className="btn btn-primary-mint btn-sm" onClick={() => setActiveModal('tx')}>
                    + Log Transaction
                  </button>
                </div>
              </div>

              <div className="feed-filters" role="group">
                {['all', 'expense', 'income', 'food', 'bills', 'social'].map(f => (
                  <button
                    key={f}
                    className={`filter-pill ${feedFilter === f ? 'active' : ''}`}
                    onClick={() => { sound.playClick(); setFeedFilter(f); }}
                  >
                    {f === 'all' ? 'All' : f === 'expense' ? 'Expenses 💸' : f === 'income' ? 'Incomes 💰' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              <div className="transactions-feed" role="feed" data-testid="transactions-feed" data-category="spending">
                {filteredTxs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                    No transactions under this filter.
                  </div>
                ) : (
                  filteredTxs.map(tx => (
                    <div key={tx.id} className="tx-row">
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
                          onClick={() => {
                            sound.playClick();
                            store.deleteTransaction(tx.id);
                            showToast('Transaction removed', 'info');
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

      </main>

      {/* MODAL: ADD TRANSACTION */}
      {activeModal === 'tx' && (
        <div className="modal-overlay active" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Log New Transaction</h3>
              <button className="modal-close" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                store.addTransaction({
                  title: fd.get('title'),
                  amount: Number(fd.get('amount')),
                  day: Number(fd.get('day')),
                  type: fd.get('type'),
                  category: fd.get('category'),
                  note: fd.get('note')
                });
                sound.playCoin();
                showToast(`Logged ₹${formatINR(fd.get('amount'))}`, 'success');
                setActiveModal(null);
              }}
            >
              <div className="form-group">
                <label htmlFor="tx-m-t">Title</label>
                <input id="tx-m-t" name="title" placeholder="e.g. Chai & Samosa" required />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="tx-m-a">Amount (₹)</label>
                  <input id="tx-m-a" name="amount" type="number" min={1} placeholder="250" required />
                </div>
                <div className="form-group">
                  <label htmlFor="tx-m-d">Day Occurred</label>
                  <input id="tx-m-d" name="day" type="number" min={1} max={30} defaultValue={state.currentDay} required />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="tx-m-ty">Type</label>
                  <select id="tx-m-ty" name="type">
                    <option value="expense">Expense 💸</option>
                    <option value="income">Income 💰</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="tx-m-c">Category</label>
                  <select id="tx-m-c" name="category">
                    <option value="food">Food & Drinks 🍕</option>
                    <option value="transit">Metro & Cabs 🚕</option>
                    <option value="social">Hangouts & Parties 🪩</option>
                    <option value="bills">Bills & Utilities ⚡</option>
                    <option value="lifestyle">Shopping & Drip 👟</option>
                    <option value="essentials">Academics & Essentials 📚</option>
                    <option value="misc">Miscellaneous ✨</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="tx-m-n">Note (Optional)</label>
                <input id="tx-m-n" name="note" placeholder="Quick comment" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary-mint">Save Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD COMMITMENT */}
      {activeModal === 'com' && (
        <div className="modal-overlay active" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Add Recurring Bill or Subscription</h3>
              <button className="modal-close" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                store.addCommitment({
                  title: fd.get('title'),
                  amount: Number(fd.get('amount')),
                  dueDay: Number(fd.get('dueDay')),
                  category: fd.get('category'),
                  autoPay: fd.get('autoPay') === 'on'
                });
                sound.playCoin();
                showToast(`Added ${fd.get('title')}`, 'success');
                setActiveModal(null);
              }}
            >
              <div className="form-group">
                <label htmlFor="c-m-t">Bill Name</label>
                <input id="c-m-t" name="title" placeholder="e.g. YouTube Premium" required />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="c-m-a">Amount (₹)</label>
                  <input id="c-m-a" name="amount" type="number" min={1} placeholder="79" required />
                </div>
                <div className="form-group">
                  <label htmlFor="c-m-d">Due on Day (1-30)</label>
                  <input id="c-m-d" name="dueDay" type="number" min={1} max={30} defaultValue={15} required />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="c-m-cat">Category</label>
                <select id="c-m-cat" name="category">
                  <option value="subscriptions">Subscriptions 🔄</option>
                  <option value="bills">Hostel / Utility Bills ⚡</option>
                  <option value="lifestyle">Gym / Wellness 🏋️</option>
                </select>
              </div>
              <div className="form-checkbox">
                <label><input type="checkbox" name="autoPay" defaultChecked /> Auto-deduct when timeline reaches this day</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary-mint">Add Commitment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SAVINGS GOAL */}
      {activeModal === 'goal' && (
        <div className="modal-overlay active" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Create Savings Target</h3>
              <button className="modal-close" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const init = Number(fd.get('initial') || 0);
                store.addSavingsGoal({
                  title: fd.get('title'),
                  targetAmount: Number(fd.get('target')),
                  currentAmount: init,
                  isLocked: fd.get('locked') === 'on'
                });
                if (init > 0) {
                  store.addTransaction({
                    day: state.currentDay,
                    title: `Initial Deposit: ${fd.get('title')}`,
                    amount: init,
                    category: 'savings',
                    type: 'expense'
                  });
                }
                sound.playSuccess();
                showToast(`Created target: ${fd.get('title')}`, 'success');
                setActiveModal(null);
              }}
            >
              <div className="form-group">
                <label htmlFor="g-m-t">Goal Name</label>
                <input id="g-m-t" name="title" placeholder="e.g. Goa Trip Stash 🌴" required />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="g-m-tgt">Target Amount (₹)</label>
                  <input id="g-m-tgt" name="target" type="number" min={100} placeholder="2000" required />
                </div>
                <div className="form-group">
                  <label htmlFor="g-m-ini">Initial Deposit (₹)</label>
                  <input id="g-m-ini" name="initial" type="number" min={0} defaultValue={0} />
                </div>
              </div>
              <div className="form-checkbox">
                <label><input type="checkbox" name="locked" defaultChecked /> Lock Shield (prevents accidental impulse withdrawals)</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary-mint">Create Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LIFE SHOCK */}
      {activeModal === 'shock' && activeShock && (
        <div className="modal-overlay active" role="dialog" aria-modal="true">
          <div className="modal-dialog shock-modal-dialog">
            <div className="shock-badge-header">{activeShock.tag.toUpperCase()}</div>
            <div className="shock-emoji">{activeShock.type === 'income' ? '🎉' : '💥'}</div>
            <h3 className="shock-title">{activeShock.title}</h3>
            <p className="shock-desc">{activeShock.description}</p>
            <div className="shock-impact-box">
              <span className="impact-label">Immediate Impact:</span>
              <strong className={`impact-amount ${activeShock.type}`}>
                {activeShock.type === 'income' ? '+' : '-'}₹{formatINR(activeShock.amount)}
              </strong>
            </div>
            <div className="modal-actions shock-actions">
              <button type="button" className="btn btn-primary-mint btn-lg w-full" onClick={handleAcceptShock}>
                Face Reality & Apply to Budget ⚡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DEPOSIT / WITHDRAW */}
      {activeModal === 'savingsAction' && savingsActionData.goal && (
        <div className="modal-overlay active" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">{savingsActionData.type === 'deposit' ? `Deposit into ${savingsActionData.goal.title}` : `Withdraw from ${savingsActionData.goal.title}`}</h3>
              <button className="modal-close" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const amt = Number(fd.get('amount'));
                if (savingsActionData.type === 'deposit') {
                  store.depositToSavings(savingsActionData.goal.id, amt);
                  sound.playCoin();
                  showToast(`Deposited ₹${formatINR(amt)}!`, 'success');
                } else {
                  store.withdrawFromSavings(savingsActionData.goal.id, amt);
                  sound.playWarning();
                  showToast(`Withdrew ₹${formatINR(amt)}!`, 'warning');
                }
                setActiveModal(null);
              }}
            >
              <div className="form-group">
                <label htmlFor="s-act-a">Amount (₹)</label>
                <input id="s-act-a" name="amount" type="number" min={10} max={savingsActionData.type === 'withdraw' ? savingsActionData.goal.currentAmount : 50000} defaultValue={savingsActionData.amount} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary-mint">Confirm {savingsActionData.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast notifications container */}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type === 'danger' ? 'toast-danger' : t.type === 'warning' ? 'toast-warning' : ''}`}>
            <span>{t.type === 'success' ? '✨' : t.type === 'danger' ? '🚨' : t.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
