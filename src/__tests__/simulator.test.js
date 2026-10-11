import { describe, it, expect, beforeEach } from 'vitest';
import { Store, INITIAL_PRESETS } from '../state.js';
import { generateAdvisorVerdict, SIMULATION_PRESETS } from '../simulator.js';

describe('MINTFLOW Decision Simulator Engine', () => {
  let testStore;

  beforeEach(() => {
    testStore = new Store(INITIAL_PRESETS);
  });

  it('correctly simulates a future splurge and generates exact negative deltas', () => {
    testStore.setSimulation({
      active: true,
      title: 'Weekend Music Fest Pass',
      amount: 1400,
      category: 'entertainment',
      type: 'expense'
    });

    const comparison = testStore.getSimulationComparison();
    expect(comparison.deltas.balance).toBe(-1400);
    expect(comparison.deltas.safeDaily).toBeLessThan(0);
    expect(comparison.simulated.rawBalance).toBe(comparison.baseline.rawBalance - 1400);
  });

  it('correctly simulates a side-hustle inflow and generates positive deltas', () => {
    testStore.setSimulation({
      active: true,
      title: 'Freelance Design Gig',
      amount: 2000,
      category: 'social',
      type: 'income'
    });

    const comparison = testStore.getSimulationComparison();
    expect(comparison.deltas.balance).toBe(2000);
    expect(comparison.deltas.safeDaily).toBeGreaterThan(0);
    expect(comparison.simulated.healthScore).toBeGreaterThanOrEqual(comparison.baseline.healthScore);
  });

  it('generates distinct AI advice across Straight Talk, Gentle Bestie, and Wall Street Bro tones', () => {
    testStore.setSimulation({
      active: true,
      title: 'Sneaker Sale',
      amount: 3000,
      category: 'lifestyle',
      type: 'expense'
    });

    const comparison = testStore.getSimulationComparison();
    const sim = testStore.state.simulation;

    const straightTalk = generateAdvisorVerdict(comparison, sim, 'straight_talk');
    const gentleBestie = generateAdvisorVerdict(comparison, sim, 'gentle_bestie');
    const wallStreet = generateAdvisorVerdict(comparison, sim, 'wall_street');

    expect(straightTalk.headline).toBeDefined();
    expect(gentleBestie.headline).toBeDefined();
    expect(wallStreet.headline).toBeDefined();

    expect(straightTalk.headline).not.toEqual(gentleBestie.headline);
    expect(gentleBestie.headline).not.toEqual(wallStreet.headline);
  });

  it('contains valid Gen Z simulation presets with required properties', () => {
    expect(SIMULATION_PRESETS.length).toBeGreaterThanOrEqual(4);
    SIMULATION_PRESETS.forEach(p => {
      expect(p.id).toBeDefined();
      expect(p.title).toBeDefined();
      expect(p.amount).toBeGreaterThan(0);
      expect(['expense', 'income']).toContain(p.type);
    });
  });
});
