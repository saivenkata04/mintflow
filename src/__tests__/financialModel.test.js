import { describe, it, expect, beforeEach } from 'vitest';
import { Store, INITIAL_PRESETS } from '../state.js';

describe('MINTFLOW Financial Calculation Model', () => {
  let testStore;

  beforeEach(() => {
    testStore = new Store(INITIAL_PRESETS);
  });

  it('correctly initializes with ₹10,000 monthly budget and preset state', () => {
    const computed = testStore.getComputedMetrics();
    expect(computed.totalIncome).toBe(10000);
    expect(computed.currentDay).toBe(6);
    expect(computed.totalDays).toBe(30);
    expect(computed.daysRemaining).toBe(25); // 30 - 6 + 1 = 25
  });

  it('calculates Safe-to-Spend daily allowance factoring in future commitments and days left', () => {
    const computed = testStore.getComputedMetrics();
    // Raw balance = 10000 - past spend
    expect(computed.rawBalance).toBeGreaterThan(0);
    // Liquid buffer = rawBalance - pendingCommitments
    expect(computed.liquidBuffer).toBe(computed.rawBalance - computed.pendingCommitments);
    // Safe daily = liquidBuffer / daysRemaining
    const expectedSafeDaily = Math.round(computed.liquidBuffer / computed.daysRemaining);
    expect(computed.safeDailySpend).toBe(expectedSafeDaily);
  });

  it('accurately advances days and auto-debits bills on their due dates', () => {
    // Before advance to Day 10, com-1 (Shared Wi-Fi, due Day 10) is unpaid
    const com1Before = testStore.state.commitments.find(c => c.id === 'com-1');
    expect(com1Before.paid).toBe(false);

    // Advance to Day 10
    testStore.setCurrentDay(10);
    expect(testStore.state.currentDay).toBe(10);

    const com1After = testStore.state.commitments.find(c => c.id === 'com-1');
    expect(com1After.paid).toBe(true);

    // Verify auto-debited transaction was recorded in ledger
    const autoTx = testStore.state.transactions.find(t => t.relatedCommitmentId === 'com-1');
    expect(autoTx).toBeDefined();
    expect(autoTx.amount).toBe(450);
  });

  it('handles edge case of Day 30 with daysRemaining = 1 without division by zero', () => {
    testStore.setCurrentDay(30);
    const computed = testStore.getComputedMetrics();
    expect(computed.daysRemaining).toBe(1);
    expect(computed.safeDailySpend).toBe(computed.liquidBuffer);
  });

  it('correctly handles deposits and withdrawals to savings vaults', () => {
    const goalId = 'sav-1'; // Emergency cushion
    const initialSaved = testStore.state.savingsGoals.find(g => g.id === goalId).currentAmount;
    
    // Deposit ₹300
    testStore.depositToSavings(goalId, 300);
    const afterDeposit = testStore.state.savingsGoals.find(g => g.id === goalId).currentAmount;
    expect(afterDeposit).toBe(initialSaved + 300);

    // Withdraw ₹200
    testStore.withdrawFromSavings(goalId, 200);
    const afterWithdraw = testStore.state.savingsGoals.find(g => g.id === goalId).currentAmount;
    expect(afterWithdraw).toBe(initialSaved + 100);
  });

  it('calculates health score within 5 to 100 boundaries', () => {
    const computed = testStore.getComputedMetrics();
    expect(computed.healthScore).toBeGreaterThanOrEqual(5);
    expect(computed.healthScore).toBeLessThanOrEqual(100);
  });

  it('triggers deficit and high-risk flags when user spends beyond runway', () => {
    // Add massive expense that exceeds buffer
    testStore.addTransaction({
      day: 6,
      title: 'Expensive Concert VIP pass',
      amount: 9000,
      category: 'entertainment',
      type: 'expense'
    });

    const computed = testStore.getComputedMetrics();
    expect(computed.riskLevel === 'DEFICIT_IMMINENT' || computed.riskLevel === 'HIGH_RISK').toBe(true);
  });
});
