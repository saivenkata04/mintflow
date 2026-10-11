import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeAmount, sanitizeDay, formatINR } from '../utils.js';

describe('MINTFLOW Security & Data Sanitization', () => {
  it('escapes dangerous HTML characters to prevent XSS attacks', () => {
    const maliciousScript = '<script>alert("hacked")</script>';
    expect(escapeHtml(maliciousScript)).toBe('&lt;script&gt;alert(&quot;hacked&quot;)&lt;/script&gt;');

    const maliciousImg = '<img src=x onerror=alert(1)>';
    expect(escapeHtml(maliciousImg)).toBe('&lt;img src=x onerror=alert(1)&gt;');

    const maliciousQuotes = 'Test "quotes" & \'apostrophes\'';
    expect(escapeHtml(maliciousQuotes)).toBe('Test &quot;quotes&quot; &amp; &#39;apostrophes&#39;');
  });

  it('safely handles non-string inputs in escapeHtml without crashing', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(123)).toBe('');
  });

  it('sanitizes and clamps financial amounts within safe numerical bounds', () => {
    expect(sanitizeAmount(500)).toBe(500);
    expect(sanitizeAmount('1250')).toBe(1250);
    expect(sanitizeAmount(-200)).toBe(0); // negatives clamped to min
    expect(sanitizeAmount('invalid_string', 100)).toBe(100); // fallback
    expect(sanitizeAmount(NaN, 50)).toBe(50);
    expect(sanitizeAmount(Infinity, 50)).toBe(50);
  });

  it('sanitizes and clamps days strictly within 1 to 30', () => {
    expect(sanitizeDay(1)).toBe(1);
    expect(sanitizeDay(30)).toBe(30);
    expect(sanitizeDay(15)).toBe(15);
    expect(sanitizeDay(0)).toBe(1); // clamped to 1
    expect(sanitizeDay(-5)).toBe(1);
    expect(sanitizeDay(35)).toBe(30); // clamped to 30
    expect(sanitizeDay('abc')).toBe(1);
  });

  it('formats numbers into Indian Rupee locale strings', () => {
    expect(formatINR(10000)).toBe('10,000');
    expect(formatINR(1500)).toBe('1,500');
    expect(formatINR(0)).toBe('0');
  });
});
