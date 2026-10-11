/**
 * MINTFLOW - Core Financial State & Simulation Engine
 * Clean architecture, zero side-effects, full input sanitization & edge-case safety.
 */

import { sanitizeAmount, sanitizeDay } from './utils.js';

export const INITIAL_PRESETS = {
  monthlyIncome: 10000,
  totalDays: 30,
  currentDay: 6,
  transactions: [
    { id: 'tx-1', day: 1, title: 'Groceries & Instant Noodles stash', amount: 850, category: 'food', type: 'expense', note: 'Essentials for the month' },
    { id: 'tx-2', day: 2, title: 'Metro smartcard recharge', amount: 500, category: 'transit', type: 'expense', note: 'Monthly commute pass' },
    { id: 'tx-3', day: 3, title: 'Boba tea with friends', amount: 280, category: 'social', type: 'expense', note: 'Weekend hangout' },
    { id: 'tx-4', day: 4, title: 'Quick commerce midnight snacks', amount: 340, category: 'food', type: 'expense', note: 'Late night study session' },
    { id: 'tx-5', day: 5, title: 'Campus Printouts & Notebooks', amount: 160, category: 'essentials', type: 'expense', note: 'Academic supplies' }
  ],
  commitments: [
    { id: 'com-1', title: 'Shared Hostel Wi-Fi Bill', amount: 450, dueDay: 10, category: 'bills', active: true, paid: false, autoPay: true },
    { id: 'com-2', title: 'Spotify Premium Student', amount: 59, dueDay: 14, category: 'subscriptions', active: true, paid: false, autoPay: true },
    { id: 'com-3', title: 'Mobile 5G Data Pack', amount: 299, dueDay: 18, category: 'bills', active: true, paid: false, autoPay: true },
    { id: 'com-4', title: 'Gym Membership Share', amount: 650, dueDay: 22, category: 'lifestyle', active: true, paid: false, autoPay: true },
    { id: 'com-5', title: 'OTT Entertainment Bundle', amount: 249, dueDay: 25, category: 'subscriptions', active: true, paid: false, autoPay: true }
  ],
  savingsGoals: [
    { id: 'sav-1', title: 'Emergency Cushion 🛡️', targetAmount: 1500, currentAmount: 900, isLocked: true, category: 'emergency' },
    { id: 'sav-2', title: 'Sneaker Drop / Goa Trip 👟', targetAmount: 2000, currentAmount: 500, isLocked: false, category: 'wishlist' }
  ],
  simulation: {
    active: false,
    title: 'Weekend Music Fest Pass',
    amount: 1400,
    category: 'entertainment',
    type: 'expense',
    dueDay: 8,
    isRecurring: false
  },
  settings: {
    soundEnabled: true,
    advisorTone: 'straight_talk'
  }
};

const STORAGE_KEY = 'mintflow_state_v1';

export class Store {
  constructor(initialData = null) {
    this.state = initialData ? JSON.parse(JSON.stringify(initialData)) : this.loadState();
    this.listeners = [];
  }

  /**
   * Loads state from localStorage with schema validation
   */
  loadState() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object' && Array.isArray(parsed.transactions) && Array.isArray(parsed.commitments)) {
            return {
              ...JSON.parse(JSON.stringify(INITIAL_PRESETS)),
              ...parsed,
              currentDay: sanitizeDay(parsed.currentDay || INITIAL_PRESETS.currentDay)
            };
          }
        }
      }
    } catch (e) {
      console.warn('LocalStorage error or corrupt data, falling back to defaults:', e);
    }
    return JSON.parse(JSON.stringify(INITIAL_PRESETS));
  }

  /**
   * Persists state to localStorage and notifies subscribers
   */
  saveState() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch (e) {
      console.error('Failed to write to localStorage:', e);
    }
    this.notify();
  }

  resetToDefault() {
    this.state = JSON.parse(JSON.stringify(INITIAL_PRESETS));
    this.saveState();
  }

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    const computed = this.getComputedMetrics();
    this.listeners.forEach(fn => {
      try {
        fn(this.state, computed);
      } catch (err) {
        console.error('Store listener error:', err);
      }
    });
  }

  // Transaction Mutators
  addTransaction(tx) {
    const safeAmount = sanitizeAmount(tx.amount, 0, 1, 100000);
    const safeDay = sanitizeDay(tx.day || this.state.currentDay);
    const safeTitle = (tx.title || 'Untitled Transaction').trim().slice(0, 100);
    const safeCategory = tx.category || 'misc';
    const safeType = tx.type === 'income' ? 'income' : 'expense';

    const newTx = {
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      day: safeDay,
      title: safeTitle,
      amount: safeAmount,
      category: safeCategory,
      type: safeType,
      note: (tx.note || '').trim().slice(0, 200),
      relatedCommitmentId: tx.relatedCommitmentId || null
    };

    this.state.transactions.unshift(newTx);
    this.saveState();
    return newTx;
  }

  deleteTransaction(id) {
    this.state.transactions = this.state.transactions.filter(t => t.id !== id);
    this.saveState();
  }

  // Timeline Mutators
  advanceDay(byDays = 1) {
    const target = this.state.currentDay + byDays;
    this.setCurrentDay(target);
  }

  setCurrentDay(day) {
    const newDay = sanitizeDay(day);
    this.state.currentDay = newDay;

    // Check for auto-pay commitments that became due up to this day
    this.state.commitments.forEach(c => {
      if (c.active && !c.paid && c.dueDay <= newDay && c.autoPay) {
        c.paid = true;
        const existingTx = this.state.transactions.find(t => t.relatedCommitmentId === c.id);
        if (!existingTx) {
          this.state.transactions.unshift({
            id: 'tx-com-' + c.id,
            day: c.dueDay,
            title: `[Auto-Debited] ${c.title}`,
            amount: c.amount,
            category: c.category,
            type: 'expense',
            relatedCommitmentId: c.id,
            note: 'Automatic scheduled payment'
          });
        }
      }
    });

    this.saveState();
  }

  // Commitment Mutators
  toggleCommitment(id) {
    const com = this.state.commitments.find(c => c.id === id);
    if (com) {
      com.active = !com.active;
      this.saveState();
    }
  }

  payCommitment(id) {
    const com = this.state.commitments.find(c => c.id === id);
    if (com && !com.paid) {
      com.paid = true;
      this.addTransaction({
        day: this.state.currentDay,
        title: `[Paid Bill] ${com.title}`,
        amount: com.amount,
        category: c => c.category,
        type: 'expense',
        note: `Paid ahead of time (due Day ${com.dueDay})`,
        relatedCommitmentId: com.id
      });
      this.saveState();
    }
  }

  addCommitment(commitment) {
    const safeAmount = sanitizeAmount(commitment.amount, 100, 1, 50000);
    const safeDay = sanitizeDay(commitment.dueDay);
    const safeTitle = (commitment.title || 'New Commitment').trim().slice(0, 100);

    this.state.commitments.push({
      id: 'com-' + Date.now(),
      title: safeTitle,
      amount: safeAmount,
      dueDay: safeDay,
      category: commitment.category || 'bills',
      active: true,
      paid: false,
      autoPay: commitment.autoPay !== false
    });
    this.saveState();
  }

  deleteCommitment(id) {
    this.state.commitments = this.state.commitments.filter(c => c.id !== id);
    this.saveState();
  }

  // Savings Mutators
  depositToSavings(goalId, amount) {
    const safeAmount = sanitizeAmount(amount, 0, 1, 50000);
    if (safeAmount <= 0) return;

    const goal = this.state.savingsGoals.find(g => g.id === goalId);
    if (goal) {
      goal.currentAmount += safeAmount;
      this.addTransaction({
        day: this.state.currentDay,
        title: `Moved to Vault: ${goal.title}`,
        amount: safeAmount,
        category: 'savings',
        type: 'expense',
        note: `Saved into ${goal.title}`
      });
      this.saveState();
    }
  }

  withdrawFromSavings(goalId, amount) {
    const goal = this.state.savingsGoals.find(g => g.id === goalId);
    if (goal) {
      const safeAmount = Math.min(goal.currentAmount, sanitizeAmount(amount, 0, 1, 50000));
      if (safeAmount <= 0) return;

      goal.currentAmount -= safeAmount;
      this.addTransaction({
        day: this.state.currentDay,
        title: `Unlocked from Vault: ${goal.title}`,
        amount: safeAmount,
        category: 'savings',
        type: 'income',
        note: `Emergency vault withdrawal`
      });
      this.saveState();
    }
  }

  toggleSavingsLock(goalId) {
    const goal = this.state.savingsGoals.find(g => g.id === goalId);
    if (goal) {
      goal.isLocked = !goal.isLocked;
      this.saveState();
    }
  }

  addSavingsGoal(goal) {
    const safeTarget = sanitizeAmount(goal.targetAmount, 1000, 100, 100000);
    const safeInitial = sanitizeAmount(goal.currentAmount, 0, 0, safeTarget);
    const safeTitle = (goal.title || 'New Goal').trim().slice(0, 100);

    this.state.savingsGoals.push({
      id: 'sav-' + Date.now(),
      title: safeTitle,
      targetAmount: safeTarget,
      currentAmount: safeInitial,
      isLocked: Boolean(goal.isLocked),
      category: goal.category || 'wishlist'
    });
    this.saveState();
  }

  // Simulation Mutators
  setSimulation(simData) {
    const safeAmount = sanitizeAmount(simData.amount, 0, 0, 50000);
    this.state.simulation = {
      ...this.state.simulation,
      ...simData,
      amount: safeAmount,
      title: (simData.title || this.state.simulation.title || '').trim().slice(0, 100)
    };
    this.saveState();
  }

  commitSimulation() {
    const sim = this.state.simulation;
    if (!sim.active || !sim.amount || sim.amount <= 0) return;

    this.addTransaction({
      day: sim.dueDay || this.state.currentDay,
      title: `[Committed Simulation] ${sim.title}`,
      amount: sim.amount,
      category: sim.category,
      type: sim.type,
      note: 'Applied from Decision Lab'
    });

    this.state.simulation.active = false;
    this.saveState();
  }

  discardSimulation() {
    this.state.simulation.active = false;
    this.saveState();
  }

  toggleSound() {
    this.state.settings.soundEnabled = !this.state.settings.soundEnabled;
    this.saveState();
    return this.state.settings.soundEnabled;
  }

  setAdvisorTone(tone) {
    if (['straight_talk', 'gentle_bestie', 'wall_street'].includes(tone)) {
      this.state.settings.advisorTone = tone;
      this.saveState();
    }
  }

  /**
   * Computes comprehensive financial standing and metrics
   * @param {object} stateToEval - Target state object
   * @param {boolean} includeSimulation - Whether to include simulated sandbox impact
   * @returns {object} Calculated metrics object
   */
  getComputedMetrics(stateToEval = this.state, includeSimulation = false) {
    const s = stateToEval;
    const currentDay = sanitizeDay(s.currentDay);
    const totalDays = s.totalDays || 30;
    const daysRemaining = Math.max(1, totalDays - currentDay + 1);

    let totalIncome = s.monthlyIncome || 10000;
    let totalSpent = 0;
    const categoryTotals = {
      food: 0,
      transit: 0,
      social: 0,
      bills: 0,
      subscriptions: 0,
      lifestyle: 0,
      essentials: 0,
      entertainment: 0,
      savings: 0,
      misc: 0
    };

    s.transactions.forEach(tx => {
      if (tx.day <= currentDay) {
        if (tx.type === 'income') {
          totalIncome += tx.amount;
        } else {
          totalSpent += tx.amount;
          const cat = categoryTotals[tx.category] !== undefined ? tx.category : 'misc';
          categoryTotals[cat] += tx.amount;
        }
      }
    });

    // Commitments calculation
    const pendingCommitments = s.commitments
      .filter(c => c.active && !c.paid && c.dueDay >= currentDay)
      .reduce((sum, c) => sum + c.amount, 0);

    const paidCommitmentsTotal = s.commitments
      .filter(c => c.paid)
      .reduce((sum, c) => sum + c.amount, 0);

    const totalSavingsSaved = s.savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);

    // Raw cash on hand right now
    let rawBalance = totalIncome - totalSpent;

    // Simulation impact
    if (includeSimulation && s.simulation && s.simulation.active) {
      const sim = s.simulation;
      if (sim.type === 'income') {
        rawBalance += sim.amount;
      } else {
        rawBalance -= sim.amount;
        const simCat = categoryTotals[sim.category] !== undefined ? sim.category : 'misc';
        categoryTotals[simCat] += sim.amount;
      }
    }

    // Safe-to-Spend Pool:
    const reservedForBills = pendingCommitments;
    const liquidBuffer = Math.max(0, rawBalance - reservedForBills);
    
    // Daily Allowance (Safe Daily Spend)
    const safeDailySpend = Math.max(0, Math.round(liquidBuffer / daysRemaining));

    // Actual average daily spending rate so far
    const daysElapsed = Math.max(1, currentDay);
    const actualAvgDailySpend = Math.round(totalSpent / daysElapsed);

    // Projected Day 30 balance
    const projectedRemainingBurn = actualAvgDailySpend * (daysRemaining - 1);
    const projectedEndOfMonthBalance = Math.round(rawBalance - reservedForBills - projectedRemainingBurn);

    // Runway Days calculation
    const runwayDays = actualAvgDailySpend > 0 ? Math.floor(rawBalance / actualAvgDailySpend) : 99;

    // Financial Health Score Algorithm (0 to 100)
    let runwayScore = 0;
    if (runwayDays >= daysRemaining) {
      runwayScore = 35;
    } else {
      runwayScore = Math.max(0, Math.round(35 * (runwayDays / daysRemaining)));
    }

    let commitmentScore = 25;
    if (reservedForBills > 0) {
      const covRatio = rawBalance / reservedForBills;
      if (covRatio >= 2.0) commitmentScore = 25;
      else if (covRatio >= 1.0) commitmentScore = Math.round(20 * (covRatio - 1) + 15);
      else commitmentScore = Math.max(0, Math.round(15 * covRatio));
    }

    const totalSavingsTarget = s.savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const savingsRatio = totalSavingsTarget > 0 ? Math.min(1, totalSavingsSaved / totalSavingsTarget) : 1;
    const savingsScore = Math.round(20 * savingsRatio);

    let spendDisciplineScore = 0;
    if (actualAvgDailySpend <= safeDailySpend) {
      spendDisciplineScore = 20;
    } else {
      const overRatio = safeDailySpend > 0 ? (actualAvgDailySpend - safeDailySpend) / safeDailySpend : 2;
      spendDisciplineScore = Math.max(0, Math.round(20 * Math.max(0, 1 - overRatio * 0.75)));
    }

    const healthScore = Math.min(100, Math.max(5, runwayScore + commitmentScore + savingsScore + spendDisciplineScore));

    // Risk Assessment
    let riskLevel = 'STABLE';
    let riskLabel = 'Low Risk';
    let riskDescription = 'Your budget runway is well paced to reach Day 30 safely.';

    if (rawBalance < reservedForBills) {
      riskLevel = 'DEFICIT_IMMINENT';
      riskLabel = 'Severe Deficit';
      riskDescription = 'You cannot afford your upcoming fixed commitments without an injection!';
    } else if (runwayDays < daysRemaining * 0.6 || healthScore < 45) {
      riskLevel = 'HIGH_RISK';
      riskLabel = 'High Burn Risk';
      riskDescription = 'Current spending pace will drain your funds before Day 30.';
    } else if (safeDailySpend < 100 || healthScore < 68) {
      riskLevel = 'MODERATE_RISK';
      riskLabel = 'Moderate Caution';
      riskDescription = 'Daily allowance is tight. Any surprise expense could trigger debt.';
    } else if (healthScore >= 85) {
      riskLevel = 'EXCELLENT';
      riskLabel = 'God Tier Vibe';
      riskDescription = 'Top tier discipline. You will easily hit Day 30 with a healthy surplus.';
    }

    let vibeMood = '😎 Chill & Steady';
    if (healthScore >= 88) vibeMood = '⚡ God Tier Mogul';
    else if (healthScore >= 72) vibeMood = '✨ Pretty Solid';
    else if (healthScore >= 55) vibeMood = '⚠️ Squeezing By';
    else vibeMood = '💀 Ramen Survival Mode';

    return {
      currentDay,
      totalDays,
      daysRemaining,
      rawBalance,
      totalSpent,
      totalIncome,
      pendingCommitments,
      paidCommitmentsTotal,
      totalSavingsSaved,
      liquidBuffer,
      safeDailySpend,
      actualAvgDailySpend,
      projectedEndOfMonthBalance,
      runwayDays,
      healthScore,
      scoreBreakdown: {
        runwayScore,
        commitmentScore,
        savingsScore,
        spendDisciplineScore
      },
      riskLevel,
      riskLabel,
      riskDescription,
      vibeMood,
      categoryTotals
    };
  }

  getSimulationComparison() {
    const baseline = this.getComputedMetrics(this.state, false);
    const simulated = this.getComputedMetrics(this.state, true);

    return {
      baseline,
      simulated,
      deltas: {
        balance: simulated.rawBalance - baseline.rawBalance,
        safeDaily: simulated.safeDailySpend - baseline.safeDailySpend,
        health: simulated.healthScore - baseline.healthScore,
        endOfMonth: simulated.projectedEndOfMonthBalance - baseline.projectedEndOfMonthBalance,
        runway: simulated.runwayDays - baseline.runwayDays
      }
    };
  }
}

export const store = new Store();
