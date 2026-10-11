/**
 * MINTFLOW - Canvas Cashflow Trajectory & Category Analytics
 * High DPI interactive visualization with ResizeObserver and RAF throttling
 */

import { rafThrottle, formatINR } from './utils.js';

export class ForecastChart {
  constructor(canvasElement, tooltipElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.tooltip = tooltipElement;
    this.comparisonData = null;
    this.commitments = [];
    this.hoveredPoint = null;
    this.resizeObserver = null;

    this.renderThrottled = rafThrottle(() => this.render());
    this.initEvents();
  }

  initEvents() {
    // High-performance ResizeObserver instead of window resize listener
    if (window.ResizeObserver && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.renderThrottled();
      });
      this.resizeObserver.observe(this.canvas.parentElement);
    } else {
      window.addEventListener('resize', this.renderThrottled);
    }

    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  setData(comparisonData, commitments = []) {
    this.comparisonData = comparisonData;
    this.commitments = commitments;
    this.renderThrottled();
  }

  handleMouseMove(e) {
    if (!this.comparisonData) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const width = rect.width;
    const padding = { left: 55, right: 25, top: 25, bottom: 35 };
    const chartWidth = width - padding.left - padding.right;

    const dayRatio = (x - padding.left) / chartWidth;
    const day = Math.round(1 + dayRatio * 29);

    if (day >= 1 && day <= 30) {
      if (this.hoveredPoint !== day) {
        this.hoveredPoint = day;
        this.renderThrottled();
      }
      this.showTooltip(e.clientX, e.clientY, day);
    } else {
      this.handleMouseLeave();
    }
  }

  handleMouseLeave() {
    if (this.hoveredPoint !== null) {
      this.hoveredPoint = null;
      this.renderThrottled();
    }
    if (this.tooltip) {
      this.tooltip.style.opacity = '0';
      this.tooltip.style.pointerEvents = 'none';
    }
  }

  showTooltip(clientX, clientY, day) {
    if (!this.tooltip || !this.comparisonData) return;
    const { baseline, simulated } = this.comparisonData;
    const isPast = day <= baseline.currentDay;

    const bill = this.commitments.find(c => c.dueDay === day && c.active);

    let html = `
      <div class="tip-header">Day ${day} ${day === baseline.currentDay ? '• 📍 TODAY' : ''}</div>
    `;

    if (bill) {
      html += `<div class="tip-bill">🔔 Bill Due: <strong>${bill.title}</strong> (-₹${formatINR(bill.amount)})</div>`;
    }

    if (isPast) {
      const spentSoFar = Math.round(baseline.actualAvgDailySpend * day);
      const estBalance = Math.max(0, 10000 - spentSoFar);
      html += `
        <div class="tip-row"><span class="dot-real"></span> Real Balance: <strong>₹${formatINR(estBalance)}</strong></div>
      `;
    } else {
      const daysFromNow = day - baseline.currentDay;
      const baseProj = Math.max(0, baseline.rawBalance - (baseline.safeDailySpend * daysFromNow));
      const simProj = Math.max(0, simulated.rawBalance - (simulated.safeDailySpend * daysFromNow));

      html += `
        <div class="tip-row"><span class="dot-safe"></span> Safe Path: <strong>₹${formatINR(Math.round(baseProj))}</strong></div>
      `;
      if (Math.abs(baseProj - simProj) > 10) {
        const delta = simProj - baseProj;
        html += `
          <div class="tip-row"><span class="dot-sim"></span> What-If Path: <strong>₹${formatINR(Math.round(simProj))}</strong> (${delta > 0 ? '+' : ''}₹${formatINR(Math.round(delta))})</div>
        `;
      }
    }

    this.tooltip.innerHTML = html;
    this.tooltip.style.left = `${clientX + 14}px`;
    this.tooltip.style.top = `${clientY - 20}px`;
    this.tooltip.style.opacity = '1';
  }

  render() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    if (!this.comparisonData) return;

    const { baseline, simulated } = this.comparisonData;
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
    this.commitments.forEach(c => {
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

    // 4. Hovered guide
    if (this.hoveredPoint && this.hoveredPoint !== baseline.currentDay) {
      const hX = getX(this.hoveredPoint);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(hX, padding.top);
      ctx.lineTo(hX, height - padding.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
