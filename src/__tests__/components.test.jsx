import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VitalsHUD from '../components/VitalsHUD.jsx';
import DecisionSimulator from '../components/DecisionSimulator.jsx';
import RippleMatrix from '../components/RippleMatrix.jsx';
import CommitmentsVault from '../components/CommitmentsVault.jsx';
import SavingsVault from '../components/SavingsVault.jsx';
import Navbar from '../components/Navbar.jsx';
import App from '../App.jsx';

describe('MINTFLOW React Components & UI Architecture', () => {
  it('renders VitalsHUD with real-time financial metrics', () => {
    const mockComputed = {
      rawBalance: 7870,
      safeDailySpend: 245,
      daysRemaining: 25,
      actualAvgDailySpend: 355,
      pendingCommitments: 1707,
      totalSavingsSaved: 1400,
      healthScore: 78,
      vibeMood: '😎 Chill & Steady',
      riskLabel: 'Low Risk',
      riskLevel: 'STABLE',
      riskDescription: 'Paced well to reach Day 30',
      projectedEndOfMonthBalance: 620
    };

    render(<VitalsHUD computed={mockComputed} />);

    expect(screen.getByTestId('balance-value')).toHaveTextContent('7,870');
    expect(screen.getByTestId('safe-daily-spend')).toHaveTextContent('245');
    expect(screen.getByTestId('health-score-value')).toHaveTextContent('78');
    expect(screen.getByTestId('risk-level-badge')).toHaveTextContent('Low Risk');
    expect(screen.getByTestId('monthly-forecast-value')).toHaveTextContent('+₹620');
  });

  it('renders DecisionSimulator with quick Gen Z preset buttons', () => {
    const handleSelectPreset = vi.fn();
    render(
      <DecisionSimulator
        simTitle="Sneakers"
        simAmount={2400}
        simCategory="lifestyle"
        simType="expense"
        activePresetIndex={0}
        onSelectPreset={handleSelectPreset}
        onTitleChange={() => {}}
        onAmountChange={() => {}}
        onCategoryChange={() => {}}
        onTypeChange={() => {}}
        onSubmit={() => {}}
      />
    );

    expect(screen.getByTestId('decision-simulator-form')).toBeInTheDocument();
    expect(screen.getByTestId('sim-title-input')).toHaveValue('Sneakers');
    expect(screen.getByTestId('sim-amount-input')).toHaveValue(2400);

    const firstPreset = screen.getByTestId('preset-zomato_binge');
    expect(firstPreset).toBeInTheDocument();
    fireEvent.click(firstPreset);
    expect(handleSelectPreset).toHaveBeenCalled();
  });

  it('renders RippleMatrix with delta impacts and AI advisor box', () => {
    const mockComparison = {
      baseline: { rawBalance: 7870, safeDailySpend: 245, healthScore: 78, projectedEndOfMonthBalance: 620, daysRemaining: 25 },
      simulated: { rawBalance: 6470, safeDailySpend: 187, healthScore: 66, projectedEndOfMonthBalance: -780 },
      deltas: { balance: -1400, safeDaily: -58, health: -12, endOfMonth: -1400 }
    };
    const mockVerdict = {
      headline: 'Hold up! Risky move detected.',
      analysis: 'Cuts daily allowance by ₹58/day.',
      recommendation: 'Wait until bills are paid.',
      verdictClass: 'warning'
    };

    render(
      <RippleMatrix
        comparison={mockComparison}
        verdict={mockVerdict}
        advisorTone="straight_talk"
        onCommit={() => {}}
        onDiscard={() => {}}
      />
    );

    expect(screen.getByTestId('ripple-effect-matrix')).toBeInTheDocument();
    expect(screen.getByTestId('delta-balance')).toHaveTextContent('-₹1,400');
    expect(screen.getByTestId('advisor-headline')).toHaveTextContent('Hold up! Risky move detected.');
    expect(screen.getByTestId('commit-decision-btn')).toBeInTheDocument();
  });

  it('renders CommitmentsVault with fixed bills and pause actions', () => {
    const mockCommitments = [
      { id: 'com-1', title: 'Hostel Wi-Fi', amount: 450, dueDay: 10, active: true, paid: false },
      { id: 'com-2', title: 'Spotify', amount: 59, dueDay: 14, active: true, paid: false }
    ];
    const toggleFn = vi.fn();

    render(
      <CommitmentsVault
        commitments={mockCommitments}
        pendingTotal={509}
        onToggleCommitment={toggleFn}
        onPayCommitment={() => {}}
        onOpenAdd={() => {}}
      />
    );

    expect(screen.getByTestId('commitments-vault')).toBeInTheDocument();
    const pauseBtn = screen.getByTestId('toggle-commitment-com-1');
    expect(pauseBtn).toHaveTextContent('Pause / Cancel');
    fireEvent.click(pauseBtn);
    expect(toggleFn).toHaveBeenCalledWith('com-1');
  });

  it('renders SavingsVault with lock shields and deposit buttons', () => {
    const mockGoals = [
      { id: 'sav-1', title: 'Emergency Shield', targetAmount: 1500, currentAmount: 900, isLocked: true }
    ];
    const toggleLockFn = vi.fn();

    render(
      <SavingsVault
        savingsGoals={mockGoals}
        totalSaved={900}
        onToggleLock={toggleLockFn}
        onOpenDeposit={() => {}}
        onOpenWithdraw={() => {}}
        onOpenAdd={() => {}}
      />
    );

    expect(screen.getByTestId('savings-vault')).toBeInTheDocument();
    expect(screen.getByTestId('vault-locked-total')).toHaveTextContent('900');
    const lockBtn = screen.getByTestId('lock-goal-sav-1');
    expect(lockBtn).toHaveTextContent('🛡️ Locked');
    fireEvent.click(lockBtn);
    expect(toggleLockFn).toHaveBeenCalledWith('sav-1');
  });

  it('renders Navbar with day stepper controls and tone selection', () => {
    const advanceFn = vi.fn();
    render(
      <Navbar
        currentDay={6}
        advisorTone="straight_talk"
        soundEnabled={true}
        onAdvanceDay={advanceFn}
        onSetTone={() => {}}
        onToggleSound={() => {}}
        onReset={() => {}}
      />
    );

    expect(screen.getByTestId('current-day-label')).toHaveTextContent('Day 6');
    fireEvent.click(screen.getByTestId('next-day-btn'));
    expect(advanceFn).toHaveBeenCalledWith(1);
  });

  it('mounts full App without crashing and allows tab switching', () => {
    render(<App />);
    expect(screen.getByTestId('financial-vitals-hud')).toBeInTheDocument();
    expect(screen.getByTestId('tab-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('tab-simulator')).toBeInTheDocument();

    // Click simulator tab
    fireEvent.click(screen.getByTestId('tab-simulator'));
    expect(screen.getByTestId('decision-simulator-form')).toBeInTheDocument();
  });
});
