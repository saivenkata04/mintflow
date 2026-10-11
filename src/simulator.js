/**
 * MINTFLOW - Decision Simulator & Gen Z Advisor Intelligence
 */

export const SIMULATION_PRESETS = [
  {
    id: 'zomato_binge',
    title: 'Late Night Swiggy/Zomato Binge 🍕',
    amount: 520,
    category: 'food',
    type: 'expense',
    tag: 'Impulse Eat',
    emoji: '🍕'
  },
  {
    id: 'weekend_concert',
    title: 'Weekend Music Fest / Club Pass 🪩',
    amount: 1800,
    category: 'social',
    type: 'expense',
    tag: 'Big Splurge',
    emoji: '🪩'
  },
  {
    id: 'sneaker_sale',
    title: 'Limited Sneaker Drop Impulse 👟',
    amount: 2400,
    category: 'lifestyle',
    type: 'expense',
    tag: 'Drip Check',
    emoji: '👟'
  },
  {
    id: 'freelance_gig',
    title: 'Graphic Design / Video Edit Gig 💻',
    amount: 2200,
    category: 'social',
    type: 'income',
    tag: 'Side Hustle',
    emoji: '💸'
  },
  {
    id: 'cancel_subscriptions',
    title: 'Cancel OTT + Gym for the Month ✂️',
    amount: 899,
    category: 'subscriptions',
    type: 'income', // treated as immediate runway reclaim
    tag: 'Bill Slash',
    emoji: '✂️'
  },
  {
    id: 'phone_repair',
    title: 'Cracked Phone Screen Repair 📱',
    amount: 1250,
    category: 'essentials',
    type: 'expense',
    tag: 'Emergency Shock',
    emoji: '💥'
  }
];

export function generateAdvisorVerdict(comparison, simDetails, tone = 'straight_talk') {
  const { baseline, simulated, deltas } = comparison;
  const isIncome = simDetails.type === 'income';
  const amount = simDetails.amount;
  const daysLeft = baseline.daysRemaining;

  // Key stats
  const dailyDrop = Math.abs(deltas.safeDaily);
  const newDaily = simulated.safeDailySpend;
  const healthDelta = deltas.health;
  const willBeDeficit = simulated.projectedEndOfMonthBalance < 0;
  const leavesNoBuffer = simulated.liquidBuffer < 500;

  let headline = '';
  let analysis = '';
  let recommendation = '';
  let verdictClass = 'neutral'; // 'danger' | 'warning' | 'success' | 'neutral'

  if (isIncome) {
    verdictClass = 'success';
    if (tone === 'straight_talk') {
      headline = 'Bag secured! Major breathing room unlocked. 🚀';
      analysis = `Injecting +₹${amount} boosts your daily allowance by +₹${Math.abs(deltas.safeDaily)}/day (up to ₹${newDaily}/day) and pumps your Health Score by +${healthDelta} pts.`;
      recommendation = `Pro tip: Put at least 40% (₹${Math.round(amount * 0.4)}) straight into your Emergency Cushion before your brain convinces you to spend it.`;
    } else if (tone === 'gentle_bestie') {
      headline = 'Omg so proud of you! That side hustle cash hits different! ✨';
      analysis = `This gives you so much peace of mind for the remaining ${daysLeft} days. Your daily budget is now ₹${newDaily}/day instead of feeling tight.`;
      recommendation = `Celebrate with a small ₹150 treat, but let the rest protect you from upcoming bills!`;
    } else {
      headline = 'Capital Inflow: Liquidity Ratios Significantly Improved. 📈';
      analysis = `Cash injection of ₹${amount} enhances Day 30 projected terminal surplus to ₹${simulated.projectedEndOfMonthBalance}. Daily burn runway extended by +${Math.max(1, deltas.runway)} days.`;
      recommendation = `Allocate ₹${Math.round(amount * 0.5)} to high-yield or emergency reserve to minimize volatility.`;
    }
    return { headline, analysis, recommendation, verdictClass };
  }

  // It's an expense: Evaluate severity
  if (willBeDeficit || simulated.rawBalance < baseline.pendingCommitments) {
    verdictClass = 'danger';
    if (tone === 'straight_talk') {
      headline = 'RED ALERT: Do this and you are officially cooked before Day 30. 💀';
      analysis = `Dropping ₹${amount} right now creates a deficit of ₹${Math.abs(simulated.projectedEndOfMonthBalance)}. Your daily allowance crashes by -₹${dailyDrop}/day down to a brutal ₹${newDaily}/day. Plus, you have ₹${baseline.pendingCommitments} in fixed bills coming up that you won\'t be able to pay.`;
      recommendation = `Do NOT swipe. If this is an absolute must, you need to either withdraw from your locked savings or make at least ₹${Math.round(amount * 0.8)} from a side gig first.`;
    } else if (tone === 'gentle_bestie') {
      headline = 'Hold up bestie... this is gonna hurt future you SO bad! 🥺';
      analysis = `I know you really want this, but spending ₹${amount} drops your daily fun money to just ₹${newDaily}/day for the next ${daysLeft} days. That is barely two chai teas.`;
      recommendation = `Can you sleep on it for 48 hours or find a dupe? You worked so hard to build your balance!`;
    } else {
      headline = 'Insolvency Warning: High Probability of Cash Crunch. ⚠️';
      analysis = `Expenditure of ₹${amount} induces a critical shortfall against scheduled liabilities (₹${baseline.pendingCommitments}). Health rating plunges by ${healthDelta} basis points.`;
      recommendation = `Reject transaction. Immediate capital reallocation or debt deferral required if nondiscretionary.`;
    }
  } else if (dailyDrop > 50 || newDaily < 180 || leavesNoBuffer) {
    verdictClass = 'warning';
    if (tone === 'straight_talk') {
      headline = 'Heads up: You can technically afford it, but you will feel the pinch. ⚠️';
      analysis = `Spending ₹${amount} chops your daily safe spend from ₹${baseline.safeDailySpend}/day down to ₹${newDaily}/day for ${daysLeft} days. Your Health Score drops by ${Math.abs(healthDelta)} pts.`;
      recommendation = `If you pull the trigger, commit to 3 strict no-spend days this week to balance the scale.`;
    } else if (tone === 'gentle_bestie') {
      headline = 'A bit risky! It will make the rest of the month super tight. ☕';
      analysis = `You have enough cash right now, but losing ₹${dailyDrop}/day means cutting back on weekend plans and quick commerce orders.`;
      recommendation = `Maybe split the cost with a friend or wait until Day 24 when your bills are cleared?`;
    } else {
      headline = 'Constrained Runway: Marginal Free Cash Flow Erosion. 📊';
      analysis = `Net liquidity buffer decreases to ₹${simulated.liquidBuffer}. Daily operational budget is contracted by ₹${dailyDrop}/diem.`;
      recommendation = `Discretionary spend should be throttled until milestone Day 20 commitments are resolved.`;
    }
  } else {
    verdictClass = 'success';
    if (tone === 'straight_talk') {
      headline = 'Green light: Your budget absorbs this with zero sweat! 🟢';
      analysis = `At ₹${amount}, your daily allowance barely budges (-₹${dailyDrop}/day to ₹${newDaily}/day). You still have ₹${simulated.liquidBuffer} safe buffer after all upcoming bills.`;
      recommendation = `Go ahead without guilt. You’ve maintained good discipline so far.`;
    } else if (tone === 'gentle_bestie') {
      headline = 'You’re totally good! Treat yourself, you earned it! 💖';
      analysis = `This fits comfortably into your ₹10k plan. You still have plenty left for your upcoming essentials.`;
      recommendation = `Enjoy it! Just keep logging your spending like a champ.`;
    } else {
      headline = 'Solvent: Transaction Within Risk Tolerance Thresholds. ✅';
      analysis = `Operating cash flows absorb ₹${amount} with negligible impact on Day 30 terminal surplus (projected: ₹${simulated.projectedEndOfMonthBalance}).`;
      recommendation = `Execute transaction. Maintain standard monitoring.`;
    }
  }

  return { headline, analysis, recommendation, verdictClass };
}
