/**
 * MINTFLOW - Utility Functions & Security Sanitizers
 */

/**
 * Escapes untrusted user strings to prevent XSS injection.
 * @param {string} str - Raw input string
 * @returns {string} Sanitized string safe for HTML interpolation
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates and sanitizes a financial amount.
 * @param {any} val - Input amount
 * @param {number} fallback - Fallback default
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Clamped safe positive number
 */
export function sanitizeAmount(val, fallback = 0, min = 0, max = 100000) {
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

/**
 * Validates and clamps timeline days within 1 to 30.
 * @param {any} day - Day input
 * @returns {number} Integer between 1 and 30
 */
export function sanitizeDay(day) {
  const num = parseInt(day, 10);
  if (isNaN(num)) return 1;
  return Math.max(1, Math.min(30, num));
}

/**
 * Formats a number to Indian Rupee (INR) currency string.
 * @param {number} num - Raw amount
 * @returns {string} Formatted INR string
 */
export function formatINR(num) {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
}

/**
 * Debounce helper for high frequency input events (e.g. range sliders)
 * @param {Function} fn - Function to debounce
 * @param {number} delayMs - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delayMs = 150) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delayMs);
  };
}

/**
 * Throttle helper using requestAnimationFrame
 * @param {Function} fn - Function to throttle
 * @returns {Function} Throttled function
 */
export function rafThrottle(fn) {
  let scheduled = false;
  return function (...args) {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        fn.apply(this, args);
        scheduled = false;
      });
    }
  };
}
