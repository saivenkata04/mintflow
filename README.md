# ⚡ MINTFLOW — Gen Z ₹10,000 / 30-Day Financial Decision Lab

> **A modern, interactive personal finance simulation engine and decision sandbox that helps Gen Z navigate a tight ₹10,000 monthly allowance across 30 days.**

[![Framework](https://img.shields.io/badge/Framework-React%2019-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Build Tool](https://img.shields.io/badge/Build-Vite%208-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tests](https://img.shields.io/badge/Tests-23%20Passing-00F5A0?logo=vitest&logoColor=black)](https://vitest.dev)
[![Deployment](https://img.shields.io/badge/Deployment-Vercel-black?logo=vercel&logoColor=white)](https://mintflow-kohl.vercel.app)

---

## 🌐 Live Demo
- **Live Vercel URL**: [https://mintflow-kohl.vercel.app](https://mintflow-kohl.vercel.app)
- **GitHub Repository**: [https://github.com/saivenkata04/mintflow](https://github.com/saivenkata04/mintflow)

---

## 🌟 Key Features & Blueprint Coverage

1. **Live Financial Vitals (HUD)**:
   - **Remaining Balance**: Live liquidity tracked against your ₹10,000 initial allowance (`data-testid="balance-card"`).
   - **Safe-to-Spend Daily Allowance**: Calculated in real-time as:
     $$\text{Safe Daily Spend} = \frac{\text{Current Balance} - \text{Remaining Unpaid Bills} - \text{Locked Savings}}{\text{Remaining Days}}$$
   - **Composite Financial Health Score (0–100)**: Factoring in Runway Buffer (35%), Commitment Coverage (25%), Savings Discipline (20%), and Burn Rate Stability (20%).
   - **Risk Radar & Day 30 Trajectory**: Predicts terminal surplus or deficit (`data-testid="financial-risk-card"`).

2. **🔮 "Before You Swipe" Decision Simulator**:
   - Test purchases, impulse splurges, or side-hustle inflows *before* spending (`data-testid="decision-simulator-form"`).
   - Real-time **Ripple Effect Matrix** comparing current reality vs simulated consequences (`data-testid="ripple-effect-matrix"`).
   - Multi-tone AI Advisor ("MintFlow Reality Check") featuring *Straight Talk 🔥*, *Gentle Bestie 🌸*, and *Wall Street Bro 💼*.
   - One-click *Commit to Ledger* or *Discard Simulation*.

3. **⏱️ 30-Day Timeline & Time Machine**:
   - Interactive day stepper (`+1 D`) and scrubber slider (`data-testid="timeline-controls"`).
   - Auto-debits scheduled bills on their due dates.
   - Roll surprise Gen Z Life Shock events (flat scooter tires, surprise UPI money from grandma, campus bounties) (`data-testid="modal-life-event"`).

4. **📈 Interactive Cashflow Trajectory Chart**:
   - High-DPI Canvas forecast curve comparing the Safe Baseline Path vs the Simulated Path.

5. **📑 Commitments & 🛡️ Savings Vault**:
   - Manage fixed recurring bills with pause/resume runway reclamation (`data-testid="commitments-vault"`).
   - Protect emergency stashes with interactive lock shields (`data-testid="savings-vault"`).

---

## 🏛️ Architecture & Component Hierarchy

```text
src/
├── components/
│   ├── Navbar.jsx               # Header, timeline steppers, tone selection, sound toggle
│   ├── VitalsHUD.jsx            # 4 HUD cards (Balance, Safe Daily, Health Score, Risk Radar)
│   ├── DecisionSimulator.jsx    # "Before You Swipe" sandbox, quick presets, custom inputs
│   ├── RippleMatrix.jsx         # Delta matrix & AI Advisor verdict card
│   ├── CommitmentsVault.jsx     # Recurring bills, auto-pay, pause/resume runway impact
│   ├── SavingsVault.jsx         # Emergency cushions, wishlist stashes, lock shields
│   ├── TransactionsFeed.jsx     # Filtered passbook ledger & transaction deletion
│   └── Modals.jsx              # Accessible modal dialogs with focus traps
├── __tests__/
│   ├── components.test.jsx      # React component integration tests (7 tests)
│   ├── financialModel.test.js   # Financial calculation & edge case tests (7 tests)
│   ├── security.test.js         # XSS sanitization & input bounds tests (5 tests)
│   ├── simulator.test.js        # Simulation deltas & advisor persona tests (4 tests)
│   └── setup.js                 # Vitest jsdom test setup
├── state.js                     # Core reactive store & mathematical model
├── simulator.js                 # Decision simulator engine & AI advisor advice
├── utils.js                     # Input sanitizers, boundary clamps, INR formatter
├── audio.js                     # Procedural Web Audio API sound synthesizer
├── events.js                    # Gen Z life shocks deck
├── App.jsx                      # Main React orchestration component
├── index.jsx                    # React 19 mount root
└── style.css                    # Modern Neo-Fintech cyber-mint design system
```

---

## 🧪 Testing & Quality Assurance

MINTFLOW includes **23 automated tests** covering financial algorithms, component rendering, security sanitization, and simulation accuracy:

```bash
# Run full Vitest test suite
npm test
```

```text
 ✓ src/__tests__/security.test.js (5 tests)
 ✓ src/__tests__/financialModel.test.js (7 tests)
 ✓ src/__tests__/simulator.test.js (4 tests)
 ✓ src/__tests__/components.test.jsx (7 tests)

 Test Files  4 passed (4)
      Tests  23 passed (23)
```

### Static Code Analysis
```bash
# Run ESLint (0 errors, 0 warnings)
npm run lint
```

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Build production bundle
npm run build
```
