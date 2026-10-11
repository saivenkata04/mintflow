import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { store } from './state.js';
import { SIMULATION_PRESETS, generateAdvisorVerdict } from './simulator.js';
import { sound } from './audio.js';
import { getRandomLifeEvent } from './events.js';
import { formatINR } from './utils.js';
import confetti from 'canvas-confetti';

import Navbar from './components/Navbar.jsx';
import VitalsHUD from './components/VitalsHUD.jsx';
import DecisionSimulator from './components/DecisionSimulator.jsx';
import RippleMatrix from './components/RippleMatrix.jsx';
import CommitmentsVault from './components/CommitmentsVault.jsx';
import SavingsVault from './components/SavingsVault.jsx';
import TransactionsFeed from './components/TransactionsFeed.jsx';
import Modals from './components/Modals.jsx';

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

  // Toast notification
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }, []);

  // Store subscription
  useEffect(() => {
    const unsubscribe = store.subscribe((newState, newComputed) => {
      setState({ ...newState });
      setComputed({ ...newComputed });
    });
    return () => unsubscribe();
  }, []);

  // Synchronize simulator with store
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
  const handleAdvanceDay = useCallback((by = 1) => {
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
  }, [state.currentDay, showToast]);

  const handleSelectPreset = useCallback((preset, idx) => {
    sound.playClick();
    setActivePresetIndex(idx);
    setSimTitle(preset.title);
    setSimAmount(preset.amount);
    setSimCategory(preset.category);
    setSimType(preset.type);
  }, []);

  const handleCommitDecision = useCallback(() => {
    const comp = store.getSimulationComparison();
    store.commitSimulation();
    if (simType === 'income') {
      sound.playSuccess();
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      showToast(`Committed! Boosted runway by +₹${formatINR(simAmount)}`, 'success');
    } else {
      if (comp.simulated.healthScore < 50) {
        sound.playWarning();
        showToast(`Committed! Watch out: Daily allowance is now ₹${formatINR(comp.simulated.safeDailySpend)}/d`, 'warning');
      } else {
        sound.playClick();
        showToast(`Decision committed: ₹${formatINR(simAmount)} logged to Day ${state.currentDay}`, 'info');
      }
    }
  }, [simType, simAmount, state.currentDay, showToast]);

  const handleRollShock = useCallback(() => {
    sound.playWarning();
    const event = getRandomLifeEvent();
    setActiveShock(event);
    setActiveModal('shock');
  }, []);

  const handleAcceptShock = useCallback(() => {
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
  }, [activeShock, state.currentDay, showToast]);

  // Memoized calculations
  const comparison = useMemo(() => store.getSimulationComparison(), [state, computed]);
  const verdict = useMemo(() => generateAdvisorVerdict(comparison, state.simulation, state.settings.advisorTone), [comparison, state.simulation, state.settings.advisorTone]);

  const filteredTxs = useMemo(() => {
    if (feedFilter === 'expense') return state.transactions.filter(t => t.type === 'expense');
    if (feedFilter === 'income') return state.transactions.filter(t => t.type === 'income');
    if (feedFilter !== 'all') return state.transactions.filter(t => t.category === feedFilter);
    return state.transactions;
  }, [state.transactions, feedFilter]);

  const nextBill = useMemo(() => {
    return state.commitments
      .filter(c => c.active && !c.paid && c.dueDay >= state.currentDay)
      .sort((a, b) => a.dueDay - b.dueDay)[0];
  }, [state.commitments, state.currentDay]);

  return (
    <div className="dark-theme app-container">
      {/* Ambient background glow */}
      <div className="ambient-glow glow-1" aria-hidden="true"></div>
      <div className="ambient-glow glow-2" aria-hidden="true"></div>

      {/* Navbar */}
      <Navbar
        currentDay={computed.currentDay}
        advisorTone={state.settings.advisorTone}
        soundEnabled={state.settings.soundEnabled}
        onAdvanceDay={handleAdvanceDay}
        onSetTone={(tone) => { store.setAdvisorTone(tone); sound.playClick(); }}
        onToggleSound={() => {
          const en = store.toggleSound();
          sound.setEnabled(en);
          showToast(en ? 'Tactile Audio Enabled' : 'Audio Muted', 'info');
        }}
        onReset={() => {
          if (confirm('Reset budget simulation back to Day 6 starting state?')) {
            store.resetToDefault();
            sound.playCoin();
            showToast('Demo state restored!', 'info');
          }
        }}
      />

      {/* Main Container */}
      <main className="app-main" id="main-content">
        {/* TOP HUD */}
        <VitalsHUD computed={computed} />

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
                      <button className="btn btn-primary-mint btn-sm" onClick={() => handleAdvanceDay(1)} data-testid="scrubber-advance-btn">
                        Advance +1 Day ›
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={handleRollShock} data-testid="roll-shock-btn">
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
                      data-testid="timeline-slider"
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
                  <button className="btn btn-primary-mint w-full" onClick={() => setActiveModal('tx')} data-testid="quick-add-tx-btn">+ Log Expense / Income</button>
                  <button className="btn btn-outline-cyan w-full" onClick={() => { sound.playClick(); setActiveTab('tab-simulator'); }} data-testid="quick-sim-btn">⚡ Test What-If Splurge</button>
                </div>

                {nextBill && (
                  <div className="upcoming-bill-alert" role="status" data-testid="upcoming-bill-alert">
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
                      data-testid="pay-next-bill-quick"
                    >
                      Pay Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: SIMULATOR */}
        {activeTab === 'tab-simulator' && (
          <section className="tab-panel active" role="tabpanel" tabIndex={0}>
            <div className="simulator-layout">
              <DecisionSimulator
                simTitle={simTitle}
                simAmount={simAmount}
                simCategory={simCategory}
                simType={simType}
                activePresetIndex={activePresetIndex}
                onSelectPreset={handleSelectPreset}
                onTitleChange={setSimTitle}
                onAmountChange={setSimAmount}
                onCategoryChange={setSimCategory}
                onTypeChange={setSimType}
                onSubmit={(e) => { e.preventDefault(); sound.playClick(); showToast('Simulation refreshed!', 'info'); }}
              />
              <RippleMatrix
                comparison={comparison}
                verdict={verdict}
                advisorTone={state.settings.advisorTone}
                onCommit={handleCommitDecision}
                onDiscard={() => {
                  sound.playClick();
                  store.discardSimulation();
                  showToast('Simulation discarded. Back to real baseline.', 'info');
                }}
              />
            </div>
          </section>
        )}

        {/* TAB 3: COMMITMENTS */}
        {activeTab === 'tab-commitments' && (
          <section className="tab-panel active" role="tabpanel" tabIndex={0}>
            <CommitmentsVault
              commitments={state.commitments}
              pendingTotal={computed.pendingCommitments}
              onToggleCommitment={(id) => {
                sound.playClick();
                store.toggleCommitment(id);
                const c = state.commitments.find(item => item.id === id);
                showToast(c?.active ? `Paused ${c.title}` : `Resumed ${c?.title}`, 'info');
              }}
              onPayCommitment={(id) => {
                sound.playCoin();
                store.payCommitment(id);
                const c = state.commitments.find(item => item.id === id);
                showToast(`Paid ${c?.title} early!`, 'success');
              }}
              onOpenAdd={() => setActiveModal('com')}
            />
          </section>
        )}

        {/* TAB 4: SAVINGS */}
        {activeTab === 'tab-savings' && (
          <section className="tab-panel active" role="tabpanel" tabIndex={0}>
            <SavingsVault
              savingsGoals={state.savingsGoals}
              totalSaved={computed.totalSavingsSaved}
              onToggleLock={(id) => {
                sound.playClick();
                store.toggleSavingsLock(id);
                const g = state.savingsGoals.find(item => item.id === id);
                showToast(g?.isLocked ? `Unlocked ${g.title}` : `Shield activated for ${g?.title}`, 'info');
              }}
              onOpenDeposit={(goal) => {
                setSavingsActionData({ goal, type: 'deposit', amount: 200 });
                setActiveModal('savingsAction');
              }}
              onOpenWithdraw={(goal) => {
                if (goal.isLocked && !confirm(`⚠️ Shield Alert: ${goal.title} is locked! Are you sure?`)) return;
                setSavingsActionData({ goal, type: 'withdraw', amount: Math.min(goal.currentAmount, 200) });
                setActiveModal('savingsAction');
              }}
              onOpenAdd={() => setActiveModal('goal')}
            />
          </section>
        )}

        {/* TAB 5: TRANSACTIONS & FEED */}
        {activeTab === 'tab-feed' && (
          <section className="tab-panel active" role="tabpanel" tabIndex={0}>
            <TransactionsFeed
              transactions={filteredTxs}
              filter={feedFilter}
              onFilterChange={(f) => { sound.playClick(); setFeedFilter(f); }}
              onDeleteTransaction={(id) => {
                sound.playClick();
                store.deleteTransaction(id);
                showToast('Transaction removed', 'info');
              }}
              onOpenAdd={() => setActiveModal('tx')}
              onRollShock={handleRollShock}
            />
          </section>
        )}
      </main>

      {/* Modals */}
      <Modals
        activeModal={activeModal}
        currentDay={state.currentDay}
        activeShock={activeShock}
        savingsActionData={savingsActionData}
        onClose={() => setActiveModal(null)}
        onAddTransaction={(tx) => {
          store.addTransaction(tx);
          sound.playCoin();
          showToast(`Logged ₹${formatINR(tx.amount)}`, 'success');
          setActiveModal(null);
        }}
        onAddCommitment={(c) => {
          store.addCommitment(c);
          sound.playCoin();
          showToast(`Added ${c.title}`, 'success');
          setActiveModal(null);
        }}
        onAddGoal={(g) => {
          store.addSavingsGoal(g);
          if (g.currentAmount > 0) {
            store.addTransaction({
              day: state.currentDay,
              title: `Initial Deposit: ${g.title}`,
              amount: g.currentAmount,
              category: 'savings',
              type: 'expense'
            });
          }
          sound.playSuccess();
          showToast(`Created target: ${g.title}`, 'success');
          setActiveModal(null);
        }}
        onAcceptShock={handleAcceptShock}
        onSavingsAction={(goalId, type, amt) => {
          if (type === 'deposit') {
            store.depositToSavings(goalId, amt);
            sound.playCoin();
            showToast(`Deposited ₹${formatINR(amt)}!`, 'success');
          } else {
            store.withdrawFromSavings(goalId, amt);
            sound.playWarning();
            showToast(`Withdrew ₹${formatINR(amt)}!`, 'warning');
          }
          setActiveModal(null);
        }}
      />

      {/* Toast notifications */}
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
