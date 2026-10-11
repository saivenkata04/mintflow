/**
 * MINTFLOW - Main Application Controller
 * High-performance, reactive UI orchestrator with full security sanitization and keyboard accessibility.
 */

import { store } from './state.js';
import { SIMULATION_PRESETS, generateAdvisorVerdict } from './simulator.js';
import { ForecastChart } from './charts.js';
import { sound } from './audio.js';
import { getRandomLifeEvent } from './events.js';
import { escapeHtml, formatINR, debounce } from './utils.js';
import confetti from 'canvas-confetti';

// Toast Notification System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'danger' ? 'toast-danger' : type === 'warning' ? 'toast-warning' : ''}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✨';
  if (type === 'danger') icon = '🚨';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `<span aria-hidden="true">${icon}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Application Class
class MintFlowApp {
  constructor() {
    this.chart = null;
    this.currentFeedFilter = 'all';
    this.activeShockEvent = null;
    this.lastFocusedElement = null;

    this.initElements();
    this.initChart();
    this.initEventListeners();
    this.initKeyboardAccessibility();
    this.renderPresets();
    
    // Subscribe to store updates
    this.unsubscribe = store.subscribe(() => this.renderAll());

    // Initial render
    this.renderAll();
  }

  initElements() {
    // HUD elements
    this.hudBalanceVal = document.getElementById('hud-balance-val');
    this.hudBalanceFill = document.getElementById('hud-balance-fill');
    this.hudReservedBills = document.getElementById('hud-reserved-bills');
    
    this.hudDailyVal = document.getElementById('hud-daily-val');
    this.hudDailySub = document.getElementById('hud-daily-sub');
    this.hudActualBurn = document.getElementById('hud-actual-burn');

    this.hudScoreVal = document.getElementById('hud-score-val');
    this.scoreCirclePath = document.getElementById('score-circle-path');
    this.hudVibeEmoji = document.getElementById('hud-vibe-emoji');
    this.hudVibeTitle = document.getElementById('hud-vibe-title');
    this.hudRunwayStatus = document.getElementById('hud-runway-status');

    this.hudRiskBadge = document.getElementById('hud-risk-badge');
    this.hudForecastVal = document.getElementById('hud-forecast-val');
    this.hudRiskDesc = document.getElementById('hud-risk-desc');

    // Day elements
    this.currentDayLabel = document.getElementById('current-day-label');
    this.dayRangeSlider = document.getElementById('day-range-slider');

    // Sim elements
    this.simPresetsGrid = document.getElementById('sim-presets-grid');
    this.simTitleInput = document.getElementById('sim-title');
    this.simAmountInput = document.getElementById('sim-amount');
    this.simCategorySelect = document.getElementById('sim-category');
    this.simTypeSelect = document.getElementById('sim-type');
    this.simRangeInput = document.getElementById('sim-range');
    this.simRangeVal = document.getElementById('sim-range-val');

    // Advisor elements
    this.advisorVerdictBox = document.getElementById('advisor-verdict-box');
    this.advisorToneTag = document.getElementById('advisor-tone-tag');
    this.advisorHeadline = document.getElementById('advisor-headline');
    this.advisorAnalysis = document.getElementById('advisor-analysis');
    this.advisorRecommendation = document.getElementById('advisor-recommendation');
    this.advisorToneSelect = document.getElementById('advisor-tone-select');

    // Matrix elements
    this.matCurBalance = document.getElementById('mat-cur-balance');
    this.matSimBalance = document.getElementById('mat-sim-balance');
    this.matDeltaBalance = document.getElementById('mat-delta-balance');

    this.matCurDaily = document.getElementById('mat-cur-daily');
    this.matSimDaily = document.getElementById('mat-sim-daily');
    this.matDeltaDaily = document.getElementById('mat-delta-daily');

    this.matCurHealth = document.getElementById('mat-cur-health');
    this.matSimHealth = document.getElementById('mat-sim-health');
    this.matDeltaHealth = document.getElementById('mat-delta-health');

    this.matCurFinish = document.getElementById('mat-cur-finish');
    this.matSimFinish = document.getElementById('mat-sim-finish');
    this.matDeltaFinish = document.getElementById('mat-delta-finish');

    // Lists
    this.commitmentsList = document.getElementById('commitments-list');
    this.savingsGoalsList = document.getElementById('savings-goals-list');
    this.transactionsFeedList = document.getElementById('transactions-feed-list');

    // Sound and settings
    this.soundToggleBtn = document.getElementById('sound-toggle-btn');
    this.soundIcon = document.getElementById('sound-icon');
  }

  initChart() {
    const canvas = document.getElementById('forecast-canvas');
    const tooltip = document.getElementById('chart-tooltip');
    if (canvas) {
      this.chart = new ForecastChart(canvas, tooltip);
    }
  }

  initKeyboardAccessibility() {
    // Close modal on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
          this.closeModal(activeModal.id);
        }
      }
    });

    // Arrow keys navigation for tabs
    const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
    tabButtons.forEach((tab, index) => {
      tab.addEventListener('keydown', (e) => {
        let targetIndex = null;
        if (e.key === 'ArrowRight') {
          targetIndex = (index + 1) % tabButtons.length;
        } else if (e.key === 'ArrowLeft') {
          targetIndex = (index - 1 + tabButtons.length) % tabButtons.length;
        }

        if (targetIndex !== null) {
          e.preventDefault();
          tabButtons[targetIndex].focus();
          tabButtons[targetIndex].click();
        }
      });
    });
  }

  initEventListeners() {
    // Sound toggle
    this.soundToggleBtn.addEventListener('click', () => {
      const isEnabled = store.toggleSound();
      sound.setEnabled(isEnabled);
      this.soundIcon.textContent = isEnabled ? '🔊' : '🔇';
      showToast(isEnabled ? 'Tactile Audio Enabled' : 'Audio Muted', 'info');
      sound.playClick();
    });

    // Reset button
    document.getElementById('reset-state-btn').addEventListener('click', () => {
      if (confirm('Reset budget simulation back to Day 6 starting state?')) {
        store.resetToDefault();
        sound.playCoin();
        showToast('Demo state restored!', 'info');
      }
    });

    // Advisor tone selector
    this.advisorToneSelect.value = store.state.settings.advisorTone;
    this.advisorToneSelect.addEventListener('change', (e) => {
      store.setAdvisorTone(e.target.value);
      sound.playClick();
      this.renderSimulator();
    });

    // Day Steppers
    document.getElementById('prev-day-btn').addEventListener('click', () => {
      store.advanceDay(-1);
      sound.playClick();
    });

    document.getElementById('next-day-btn').addEventListener('click', () => {
      this.advanceTimeline();
    });

    document.getElementById('scrubber-advance-btn').addEventListener('click', () => {
      this.advanceTimeline();
    });

    this.dayRangeSlider.addEventListener('input', (e) => {
      store.setCurrentDay(Number(e.target.value));
    });

    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const tabId = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        
        const activePanel = document.getElementById(tabId);
        if (activePanel) {
          activePanel.classList.add('active');
        }

        if (tabId === 'tab-dashboard' && this.chart) {
          setTimeout(() => this.chart.render(), 50);
        }
      });
    });

    // Quick Action shortcuts
    document.getElementById('jump-to-simulator-btn').addEventListener('click', () => {
      sound.playClick();
      const simTabBtn = document.querySelector('[data-tab="tab-simulator"]');
      if (simTabBtn) simTabBtn.click();
    });

    document.getElementById('open-add-expense-btn').addEventListener('click', () => {
      this.openModal('modal-transaction');
    });

    document.getElementById('feed-add-tx-btn').addEventListener('click', () => {
      this.openModal('modal-transaction');
    });

    document.getElementById('open-add-commitment-btn').addEventListener('click', () => {
      this.openModal('modal-commitment');
    });

    document.getElementById('open-add-goal-btn').addEventListener('click', () => {
      this.openModal('modal-savings');
    });

    // Life Shock roll buttons
    document.getElementById('roll-shock-btn').addEventListener('click', () => this.rollLifeEvent());
    document.getElementById('feed-roll-shock-btn').addEventListener('click', () => this.rollLifeEvent());

    // Accept Shock button
    document.getElementById('accept-shock-btn').addEventListener('click', () => {
      if (this.activeShockEvent) {
        store.addTransaction({
          day: store.state.currentDay,
          title: `[Shock Event] ${this.activeShockEvent.title}`,
          amount: this.activeShockEvent.amount,
          category: this.activeShockEvent.category,
          type: this.activeShockEvent.type,
          note: this.activeShockEvent.description
        });

        if (this.activeShockEvent.type === 'income') {
          sound.playCoin();
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
          showToast(`+₹${formatINR(this.activeShockEvent.amount)} added to balance!`, 'success');
        } else {
          sound.playWarning();
          showToast(`-₹${formatINR(this.activeShockEvent.amount)} deducted from runway!`, 'danger');
        }

        this.closeModal('modal-life-event');
        this.activeShockEvent = null;
      }
    });

    // Debounced simulator controls
    const debouncedUpdateSim = debounce(() => this.updateActiveSimulation(), 100);

    this.simRangeInput.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      this.simAmountInput.value = val;
      this.simRangeVal.textContent = `₹${formatINR(val)}`;
      debouncedUpdateSim();
    });

    this.simAmountInput.addEventListener('input', (e) => {
      const val = Number(e.target.value) || 0;
      this.simRangeInput.value = Math.min(5000, Math.max(100, val));
      this.simRangeVal.textContent = `₹${formatINR(val)}`;
      debouncedUpdateSim();
    });

    this.simTitleInput.addEventListener('input', debouncedUpdateSim);
    this.simCategorySelect.addEventListener('change', () => this.updateActiveSimulation());
    this.simTypeSelect.addEventListener('change', () => this.updateActiveSimulation());

    document.getElementById('custom-sim-form').addEventListener('submit', (e) => {
      e.preventDefault();
      sound.playClick();
      this.updateActiveSimulation();
      showToast('Simulation refreshed with new variables', 'info');
    });

    // Commit Decision Button
    document.getElementById('commit-decision-btn').addEventListener('click', () => {
      const comp = store.getSimulationComparison();
      const sim = store.state.simulation;
      if (!sim.amount) return;

      store.commitSimulation();

      if (sim.type === 'income') {
        sound.playSuccess();
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
        showToast(`Committed! Boosted runway by +₹${formatINR(sim.amount)}`, 'success');
      } else {
        if (comp.simulated.healthScore < 50) {
          sound.playWarning();
          showToast(`Committed! Watch out: Daily allowance is now ₹${comp.simulated.safeDailySpend}/d`, 'warning');
        } else {
          sound.playClick();
          showToast(`Decision committed: ₹${formatINR(sim.amount)} logged to Day ${store.state.currentDay}`, 'info');
        }
      }

      this.selectPreset(SIMULATION_PRESETS[0]);
    });

    // Discard Simulation Button
    document.getElementById('discard-sim-btn').addEventListener('click', () => {
      sound.playClick();
      store.discardSimulation();
      showToast('Simulation discarded. Back to real budget baseline.', 'info');
    });

    // Feed Filter buttons
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFeedFilter = btn.getAttribute('data-filter');
        this.renderFeed();
      });
    });

    // Modal Close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        this.closeModal(modalId);
      });
    });

    // Form Submissions
    document.getElementById('form-add-transaction').addEventListener('submit', (e) => {
      e.preventDefault();
      sound.playCoin();
      const title = document.getElementById('tx-title').value;
      const amount = Number(document.getElementById('tx-amount').value);
      const day = Number(document.getElementById('tx-day').value);
      const type = document.getElementById('tx-type').value;
      const category = document.getElementById('tx-category').value;
      const note = document.getElementById('tx-note').value;

      store.addTransaction({ title, amount, day, type, category, note });
      this.closeModal('modal-transaction');
      document.getElementById('form-add-transaction').reset();
      showToast(`Logged ₹${formatINR(amount)} for ${title}`, 'success');
    });

    document.getElementById('form-add-commitment').addEventListener('submit', (e) => {
      e.preventDefault();
      sound.playCoin();
      const title = document.getElementById('com-title').value;
      const amount = Number(document.getElementById('com-amount').value);
      const dueDay = Number(document.getElementById('com-day').value);
      const category = document.getElementById('com-category').value;
      const autoPay = document.getElementById('com-autopay').checked;

      store.addCommitment({ title, amount, dueDay, category, autoPay });
      this.closeModal('modal-commitment');
      document.getElementById('form-add-commitment').reset();
      showToast(`Added ${title} (Due Day ${dueDay})`, 'success');
    });

    document.getElementById('form-add-goal').addEventListener('submit', (e) => {
      e.preventDefault();
      sound.playSuccess();
      const title = document.getElementById('goal-title').value;
      const targetAmount = Number(document.getElementById('goal-target').value);
      const initialAmount = Number(document.getElementById('goal-initial').value);
      const isLocked = document.getElementById('goal-locked').checked;

      store.addSavingsGoal({ title, targetAmount, currentAmount: initialAmount, isLocked });
      if (initialAmount > 0) {
        store.addTransaction({
          day: store.state.currentDay,
          title: `Initial Deposit: ${title}`,
          amount: initialAmount,
          category: 'savings',
          type: 'expense',
          note: 'Allocated to new savings target'
        });
      }
      this.closeModal('modal-savings');
      document.getElementById('form-add-goal').reset();
      showToast(`Target created: ${title}`, 'success');
    });

    document.getElementById('form-savings-action').addEventListener('submit', (e) => {
      e.preventDefault();
      const goalId = document.getElementById('action-goal-id').value;
      const actionType = document.getElementById('action-goal-type').value;
      const amount = Number(document.getElementById('action-amount').value);

      if (actionType === 'deposit') {
        store.depositToSavings(goalId, amount);
        sound.playCoin();
        showToast(`Stashed ₹${formatINR(amount)} into Vault!`, 'success');
      } else {
        store.withdrawFromSavings(goalId, amount);
        sound.playWarning();
        showToast(`Unlocked ₹${formatINR(amount)} from Vault back to liquid cash`, 'warning');
      }
      this.closeModal('modal-savings-action');
    });

    // Pay next bill shortcut in dashboard
    document.getElementById('pay-next-bill-quick').addEventListener('click', () => {
      const nextBill = store.state.commitments.find(c => c.active && !c.paid && c.dueDay >= store.state.currentDay);
      if (nextBill) {
        store.payCommitment(nextBill.id);
        sound.playCoin();
        showToast(`Paid ${nextBill.title} (₹${formatINR(nextBill.amount)}) early!`, 'success');
      }
    });
  }

  advanceTimeline() {
    const prevDay = store.state.currentDay;
    store.advanceDay(1);
    const newDay = store.state.currentDay;

    if (newDay > prevDay) {
      sound.playClick();
      if (newDay === 30) {
        sound.playSuccess();
        confetti({ particleCount: 100, spread: 100, origin: { y: 0.5 } });
        showToast('🎉 Day 30 Reached! You navigated the entire month!', 'success');
      } else {
        showToast(`Stepped to Day ${newDay} of 30`, 'info');
      }
    }
  }

  rollLifeEvent() {
    sound.playWarning();
    const event = getRandomLifeEvent();
    this.activeShockEvent = event;

    document.getElementById('shock-event-tag').textContent = event.tag.toUpperCase();
    document.getElementById('shock-event-emoji').textContent = event.type === 'income' ? '🎉' : '💥';
    document.getElementById('shock-event-title').textContent = event.title;
    document.getElementById('shock-event-desc').textContent = event.description;

    const amtEl = document.getElementById('shock-impact-amt');
    amtEl.textContent = `${event.type === 'income' ? '+' : '-'}₹${formatINR(event.amount)}`;
    amtEl.className = `impact-amount ${event.type}`;

    this.openModal('modal-life-event');
  }

  openModal(modalId) {
    this.lastFocusedElement = document.activeElement;
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      const firstInput = modal.querySelector('input, select, button');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 50);
      }
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
        this.lastFocusedElement.focus();
      }
    }
  }

  renderPresets() {
    this.simPresetsGrid.innerHTML = '';
    SIMULATION_PRESETS.forEach((preset, idx) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `preset-chip ${idx === 0 ? 'active' : ''}`;
      chip.innerHTML = `
        <span class="preset-title">${escapeHtml(preset.title)}</span>
        <div class="preset-meta">
          <span class="preset-amount ${preset.type}">${preset.type === 'income' ? '+' : '-'}₹${formatINR(preset.amount)}</span>
          <span class="preset-tag">${escapeHtml(preset.tag)}</span>
        </div>
      `;
      chip.addEventListener('click', () => {
        sound.playClick();
        document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.selectPreset(preset);
      });
      this.simPresetsGrid.appendChild(chip);
    });

    this.selectPreset(SIMULATION_PRESETS[0]);
  }

  selectPreset(preset) {
    this.simTitleInput.value = preset.title;
    this.simAmountInput.value = preset.amount;
    this.simRangeInput.value = Math.min(5000, Math.max(100, preset.amount));
    this.simRangeVal.textContent = `₹${formatINR(preset.amount)}`;
    this.simCategorySelect.value = preset.category;
    this.simTypeSelect.value = preset.type;

    this.updateActiveSimulation();
  }

  updateActiveSimulation() {
    const title = this.simTitleInput.value || 'Custom Action';
    const amount = Number(this.simAmountInput.value) || 0;
    const category = this.simCategorySelect.value;
    const type = this.simTypeSelect.value;

    store.setSimulation({
      active: true,
      title,
      amount,
      category,
      type
    });
  }

  renderAll() {
    const computed = store.getComputedMetrics();
    const comparison = store.getSimulationComparison();

    this.renderHUD(computed);
    this.renderDayControls(computed);
    this.renderDashboardSidebar(computed);
    this.renderSimulator(comparison);
    this.renderCommitments();
    this.renderSavings();
    this.renderFeed();

    if (this.chart) {
      this.chart.setData(comparison, store.state.commitments);
    }
  }

  renderHUD(computed) {
    // 1. Balance
    this.hudBalanceVal.textContent = formatINR(computed.rawBalance);
    const balancePct = Math.max(0, Math.min(100, (computed.rawBalance / 10000) * 100));
    this.hudBalanceFill.style.width = `${balancePct}%`;
    this.hudReservedBills.textContent = `₹${formatINR(computed.pendingCommitments)} locked for bills`;

    // 2. Safe Daily
    this.hudDailyVal.textContent = formatINR(computed.safeDailySpend);
    this.hudDailySub.textContent = `For remaining ${computed.daysRemaining} days`;
    this.hudActualBurn.textContent = `Avg Burn: ₹${formatINR(computed.actualAvgDailySpend)}/d`;

    // 3. Health Score
    this.hudScoreVal.textContent = computed.healthScore;
    const scoreVal = computed.healthScore;
    this.scoreCirclePath.setAttribute('stroke-dasharray', `${scoreVal}, 100`);

    let scoreColor = '#00F5A0';
    if (scoreVal < 45) scoreColor = '#F43F5E';
    else if (scoreVal < 70) scoreColor = '#FBBF24';
    this.scoreCirclePath.style.stroke = scoreColor;

    this.hudVibeEmoji.textContent = computed.vibeMood.split(' ')[0];
    this.hudVibeTitle.textContent = computed.vibeMood;
    this.hudRunwayStatus.textContent = `Runway: ${computed.runwayDays} Days`;

    // 4. Risk Radar
    this.hudRiskBadge.textContent = computed.riskLabel;
    this.hudRiskBadge.className = `risk-badge ${computed.riskLevel === 'HIGH_RISK' || computed.riskLevel === 'DEFICIT_IMMINENT' ? 'badge-danger' : computed.riskLevel === 'MODERATE_RISK' ? 'badge-amber' : ''}`;
    
    const eom = computed.projectedEndOfMonthBalance;
    this.hudForecastVal.textContent = `${eom >= 0 ? '+' : ''}₹${formatINR(eom)}`;
    this.hudForecastVal.className = `hud-forecast-amt ${eom < 0 ? 'text-rose' : 'text-mint'}`;
    this.hudRiskDesc.textContent = computed.riskDescription;
  }

  renderDayControls(computed) {
    this.currentDayLabel.textContent = `Day ${computed.currentDay}`;
    this.dayRangeSlider.value = computed.currentDay;
    this.dayRangeSlider.setAttribute('aria-valuenow', computed.currentDay);
    document.getElementById('tx-day').value = computed.currentDay;
  }

  renderDashboardSidebar(computed) {
    const totalCap = 10000;
    const spentPct = Math.min(100, (computed.totalSpent / totalCap) * 100);
    const billsPct = Math.min(100, (computed.pendingCommitments / totalCap) * 100);
    const savingsPct = Math.min(100, (computed.totalSavingsSaved / totalCap) * 100);
    const runwayPct = Math.max(0, 100 - (spentPct + billsPct + savingsPct));

    document.getElementById('dist-spent-val').textContent = `₹${formatINR(computed.totalSpent)}`;
    document.getElementById('dist-spent-bar').style.width = `${spentPct}%`;

    document.getElementById('dist-bills-val').textContent = `₹${formatINR(computed.pendingCommitments)}`;
    document.getElementById('dist-bills-bar').style.width = `${billsPct}%`;

    document.getElementById('dist-savings-val').textContent = `₹${formatINR(computed.totalSavingsSaved)}`;
    document.getElementById('dist-savings-bar').style.width = `${savingsPct}%`;

    document.getElementById('dist-runway-val').textContent = `₹${formatINR(computed.liquidBuffer)}`;
    document.getElementById('dist-runway-bar').style.width = `${runwayPct}%`;

    // Next Bill Alert
    const nextBill = store.state.commitments
      .filter(c => c.active && !c.paid && c.dueDay >= computed.currentDay)
      .sort((a, b) => a.dueDay - b.dueDay)[0];

    const alertBox = document.getElementById('upcoming-bill-alert');
    if (nextBill) {
      alertBox.style.display = 'flex';
      const daysUntil = nextBill.dueDay - computed.currentDay;
      document.getElementById('next-bill-title').textContent = daysUntil === 0 ? '⚡ Bill Due Today!' : `Next Bill in ${daysUntil} Days`;
      document.getElementById('next-bill-sub').textContent = `Day ${nextBill.dueDay} • ${escapeHtml(nextBill.title)} (₹${formatINR(nextBill.amount)})`;
    } else {
      alertBox.style.display = 'none';
    }
  }

  renderSimulator(comparisonData = store.getSimulationComparison()) {
    const { baseline, simulated, deltas } = comparisonData;
    const sim = store.state.simulation;

    // Remaining Balance tile
    this.matCurBalance.textContent = `₹${formatINR(baseline.rawBalance)}`;
    this.matSimBalance.textContent = `₹${formatINR(simulated.rawBalance)}`;
    this.matDeltaBalance.textContent = `${deltas.balance > 0 ? '+' : ''}₹${formatINR(deltas.balance)}`;
    this.matDeltaBalance.className = `tile-delta ${deltas.balance >= 0 ? 'positive' : ''}`;

    // Safe Daily tile
    this.matCurDaily.textContent = `₹${formatINR(baseline.safeDailySpend)}/d`;
    this.matSimDaily.textContent = `₹${formatINR(simulated.safeDailySpend)}/d`;
    const dailyDiff = deltas.safeDaily;
    this.matDeltaDaily.textContent = `${dailyDiff > 0 ? '+' : ''}₹${formatINR(dailyDiff)}/d for ${baseline.daysRemaining} days`;
    this.matDeltaDaily.className = `tile-delta ${dailyDiff >= 0 ? 'positive' : ''}`;

    // Health Score tile
    this.matCurHealth.textContent = `${baseline.healthScore} pts`;
    this.matSimHealth.textContent = `${simulated.healthScore} pts`;
    this.matDeltaHealth.textContent = `${deltas.health > 0 ? '+' : ''}${deltas.health} pts`;
    this.matDeltaHealth.className = `tile-delta ${deltas.health >= 0 ? 'positive' : ''}`;

    // Day 30 finish tile
    this.matCurFinish.textContent = `${baseline.projectedEndOfMonthBalance >= 0 ? '+' : ''}₹${formatINR(baseline.projectedEndOfMonthBalance)}`;
    this.matSimFinish.textContent = `${simulated.projectedEndOfMonthBalance >= 0 ? '+' : ''}₹${formatINR(simulated.projectedEndOfMonthBalance)}`;
    
    if (simulated.projectedEndOfMonthBalance < 0) {
      this.matDeltaFinish.textContent = `Deficit Shock (Broke)`;
      this.matDeltaFinish.className = 'tile-delta';
    } else {
      this.matDeltaFinish.textContent = `${deltas.endOfMonth > 0 ? '+' : ''}₹${formatINR(deltas.endOfMonth)} net swing`;
      this.matDeltaFinish.className = `tile-delta ${deltas.endOfMonth >= 0 ? 'positive' : ''}`;
    }

    // AI Advisor Verdict
    const tone = store.state.settings.advisorTone;
    const verdict = generateAdvisorVerdict(comparisonData, sim, tone);

    this.advisorVerdictBox.className = `advisor-verdict-box ${verdict.verdictClass}`;
    
    let toneTagText = 'Straight Talk Mode 🔥';
    if (tone === 'gentle_bestie') toneTagText = 'Gentle Bestie Mode 🌸';
    if (tone === 'wall_street') toneTagText = 'Wall Street Mode 💼';
    this.advisorToneTag.textContent = toneTagText;

    this.advisorHeadline.textContent = verdict.headline;
    this.advisorAnalysis.textContent = verdict.analysis;
    this.advisorRecommendation.innerHTML = verdict.recommendation;
  }

  renderCommitments() {
    const commitments = store.state.commitments;
    const currentDay = store.state.currentDay;

    document.getElementById('tab-bills-count').textContent = commitments.length;

    const totalAll = commitments.reduce((sum, c) => sum + c.amount, 0);
    const totalPending = commitments.filter(c => c.active && !c.paid && c.dueDay >= currentDay).reduce((sum, c) => sum + c.amount, 0);
    const dailyImpact = Math.round(totalAll / 30);

    document.getElementById('comm-total-all').textContent = `₹${formatINR(totalAll)}`;
    document.getElementById('comm-total-pending').textContent = `₹${formatINR(totalPending)}`;
    document.getElementById('comm-daily-impact').textContent = `~₹${formatINR(dailyImpact)}/day`;

    this.commitmentsList.innerHTML = '';
    commitments.forEach(c => {
      const card = document.createElement('div');
      card.className = `comm-card ${!c.active ? 'paused' : ''}`;
      card.setAttribute('role', 'listitem');
      card.innerHTML = `
        <div class="comm-header">
          <span class="comm-title">${escapeHtml(c.title)}</span>
          <span class="comm-due-tag ${c.paid ? 'paid' : ''}">
            ${c.paid ? 'PAID' : `DUE DAY ${c.dueDay}`}
          </span>
        </div>
        <div class="comm-body">
          <span class="comm-amount">₹${formatINR(c.amount)}</span>
          <span class="comm-daily-slice">Locks ~₹${formatINR(Math.round(c.amount / 30))}/day</span>
        </div>
        <div class="comm-footer">
          <button class="btn btn-ghost btn-sm btn-toggle-comm" data-id="${c.id}">
            ${c.active ? 'Pause / Cancel' : 'Resume Bill'}
          </button>
          ${!c.paid && c.active ? `
            <button class="btn btn-secondary btn-sm btn-pay-comm" data-id="${c.id}">
              Pay Early
            </button>
          ` : ''}
        </div>
      `;

      card.querySelector('.btn-toggle-comm').addEventListener('click', () => {
        sound.playClick();
        store.toggleCommitment(c.id);
        showToast(c.active ? `Paused ${c.title}. Saved ₹${formatINR(c.amount)} from runway!` : `Resumed ${c.title}`, 'info');
      });

      const payBtn = card.querySelector('.btn-pay-comm');
      if (payBtn) {
        payBtn.addEventListener('click', () => {
          sound.playCoin();
          store.payCommitment(c.id);
          showToast(`Paid ${c.title} (₹${formatINR(c.amount)})`, 'success');
        });
      }

      this.commitmentsList.appendChild(card);
    });
  }

  renderSavings() {
    const goals = store.state.savingsGoals;
    document.getElementById('tab-savings-count').textContent = goals.length;

    const totalVault = goals.reduce((sum, g) => sum + g.currentAmount, 0);
    document.getElementById('vault-total-val').textContent = `₹${formatINR(totalVault)}`;

    this.savingsGoalsList.innerHTML = '';
    goals.forEach(goal => {
      const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));

      const card = document.createElement('div');
      card.className = 'goal-card';
      card.setAttribute('role', 'listitem');
      card.innerHTML = `
        <div class="goal-card-header">
          <span class="goal-title">${escapeHtml(goal.title)}</span>
          <button class="lock-shield-btn ${goal.isLocked ? 'locked' : ''}" data-id="${goal.id}" aria-label="Toggle lock shield for ${escapeHtml(goal.title)}">
            ${goal.isLocked ? '🛡️ Locked' : '🔓 Unlocked'}
          </button>
        </div>
        <div class="goal-progress-wrap">
          <div class="goal-amt-row">
            <span class="goal-current">₹${formatINR(goal.currentAmount)} saved</span>
            <span class="goal-target">Target: ₹${formatINR(goal.targetAmount)} (${pct}%)</span>
          </div>
          <div class="goal-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHtml(goal.title)} progress">
            <div class="goal-fill" style="width: ${pct}%"></div>
          </div>
        </div>
        <div class="goal-actions">
          <button class="btn btn-outline-cyan btn-sm btn-deposit" data-id="${goal.id}">+ Deposit</button>
          <button class="btn btn-ghost btn-sm btn-withdraw" data-id="${goal.id}">- Withdraw</button>
        </div>
      `;

      card.querySelector('.lock-shield-btn').addEventListener('click', () => {
        sound.playClick();
        store.toggleSavingsLock(goal.id);
        showToast(goal.isLocked ? `Unlocked ${goal.title}` : `Shield activated for ${goal.title}`, 'info');
      });

      card.querySelector('.btn-deposit').addEventListener('click', () => {
        this.openSavingsActionModal(goal, 'deposit');
      });

      card.querySelector('.btn-withdraw').addEventListener('click', () => {
        if (goal.isLocked) {
          if (!confirm(`⚠️ Shield Alert: ${goal.title} is protected! Are you sure you want to pull emergency funds? This hurts your savings health score!`)) {
            return;
          }
        }
        this.openSavingsActionModal(goal, 'withdraw');
      });

      this.savingsGoalsList.appendChild(card);
    });
  }

  openSavingsActionModal(goal, type) {
    document.getElementById('action-goal-id').value = goal.id;
    document.getElementById('action-goal-type').value = type;
    document.getElementById('savings-action-title').textContent = type === 'deposit' ? `Deposit into ${goal.title}` : `Withdraw from ${goal.title}`;
    document.getElementById('action-amount-label').textContent = `Amount to ${type === 'deposit' ? 'stash' : 'withdraw'} (₹)`;
    document.getElementById('action-amount').value = type === 'deposit' ? 200 : Math.min(goal.currentAmount, 200);
    document.getElementById('savings-action-submit-btn').textContent = type === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal';
    this.openModal('modal-savings-action');
  }

  renderFeed() {
    const txs = store.state.transactions;
    const filter = this.currentFeedFilter;

    let filtered = txs;
    if (filter === 'expense') filtered = txs.filter(t => t.type === 'expense');
    else if (filter === 'income') filtered = txs.filter(t => t.type === 'income');
    else if (filter !== 'all') filtered = txs.filter(t => t.category === filter);

    this.transactionsFeedList.innerHTML = '';
    if (filtered.length === 0) {
      this.transactionsFeedList.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-dim);">No transactions found under "${escapeHtml(filter)}" filter.</div>`;
      return;
    }

    filtered.forEach(tx => {
      const row = document.createElement('div');
      row.className = 'tx-row';
      row.innerHTML = `
        <div class="tx-left">
          <span class="tx-day-badge">DAY ${tx.day}</span>
          <div class="tx-title-group">
            <span class="tx-title">${escapeHtml(tx.title)}</span>
            <span class="tx-note">${escapeHtml(tx.note || tx.category)}</span>
          </div>
        </div>
        <div class="tx-right">
          <span class="tx-amount ${tx.type}">${tx.type === 'income' ? '+' : '-'}₹${formatINR(tx.amount)}</span>
          <button class="tx-delete-btn" title="Delete entry" data-id="${tx.id}" aria-label="Delete transaction ${escapeHtml(tx.title)}">×</button>
        </div>
      `;

      row.querySelector('.tx-delete-btn').addEventListener('click', () => {
        sound.playClick();
        store.deleteTransaction(tx.id);
        showToast('Entry removed', 'info');
      });

      this.transactionsFeedList.appendChild(row);
    });
  }
}

// Boot application
window.addEventListener('DOMContentLoaded', () => {
  new MintFlowApp();
});
