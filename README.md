# ⚡ MINTFLOW — Gen Z ₹10,000 / 30-Day Financial Decision Lab

> A modern, interactive personal finance simulation engine and decision sandbox that helps Gen Z navigate a ₹10,000 monthly allowance across 30 days.

---

## 🌟 Key Features

- **Live Financial Vitals (HUD)**: Real-time tracking of Liquid Balance, Safe-to-Spend Daily Allowance, Composite Financial Health Score (0–100), and Survival Risk Radar.
- **🔮 "Before You Swipe" Decision Simulator**:
  - Test purchases, impulse splurges, or side-hustle inflows *before* spending.
  - Generates a real-time **Ripple Effect Matrix** comparing current reality vs simulated consequences.
  - Multi-tone AI Advisor ("MintFlow Reality Check") featuring *Straight Talk 🔥*, *Gentle Bestie 🌸*, and *Wall Street Bro 💼*.
  - One-click *Commit to Ledger* or *Discard Simulation*.
- **⏱️ 30-Day Timeline & Time Machine**:
  - Interactive day stepper (`+1 D`) and scrubber slider.
  - Auto-debits scheduled bills on their due dates.
  - Roll surprise Gen Z Life Shock events (flat scooter tires, surprise UPI money from grandma, campus bounties).
- **📈 Interactive Cashflow Trajectory Chart**: High-DPI Canvas forecast curve comparing the Safe Baseline Path vs the Simulated Path.
- **📑 Commitments & 🛡️ Savings Vault**:
  - Manage fixed recurring bills with pause/resume runway reclamation.
  - Protect emergency stashes with interactive lock shields.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation & Development
```bash
# Clone the repository
git clone <your-repo-url>
cd MINTFLOW

# Install dependencies
npm install

# Start local dev server
npm run dev

# Open in browser: http://localhost:5173/
```

### Production Build & Preview
```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

### Running Automated Tests
```bash
# Run Vitest unit test suite (16 tests covering financial model, security, and simulator)
npm test
```

---

## 🏗️ Architecture & Technology Stack

- **Core**: Vanilla HTML5, Vanilla JavaScript (ES Modules).
- **Styling**: Vanilla CSS (Cyber-mint dark mode, glassmorphism, responsive CSS grid/flexbox).
- **Visualization**: HTML5 Canvas with `ResizeObserver` & `requestAnimationFrame` throttling.
- **Tactile Feedback**: Procedural Web Audio API sound synthesizer.
- **Testing**: Vitest automated test runner.
- **Build Tool**: Vite.

---

## 🛡️ Security & Accessibility

- **Input Sanitization**: Built-in HTML character escaping on all dynamic template strings to prevent XSS.
- **Accessibility**: Full semantic ARIA landmark structure (`tablist`, `tab`, `tabpanel`, `dialog`), `aria-live="polite"` HUD regions, keyboard navigation (`Arrow` keys for tabs, `Escape` key for dialogs), and visible focus indicators.
