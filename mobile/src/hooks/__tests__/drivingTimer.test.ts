// Test driving timer utility functions
describe('DrivingTimer — time formatting', () => {
  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}s ${m}dk`;
  }

  it('should format 0 seconds', () => {
    expect(formatTime(0)).toBe('0s 0dk');
  });

  it('should format 1 hour', () => {
    expect(formatTime(3600)).toBe('1s 0dk');
  });

  it('should format 4.5 hours (session limit)', () => {
    expect(formatTime(16200)).toBe('4s 30dk');
  });

  it('should format 9 hours (daily limit)', () => {
    expect(formatTime(32400)).toBe('9s 0dk');
  });

  it('should format 30 minutes', () => {
    expect(formatTime(1800)).toBe('0s 30dk');
  });

  it('should format 2h 15m', () => {
    expect(formatTime(8100)).toBe('2s 15dk');
  });
});

describe('DrivingTimer — progress calculation', () => {
  function calcProgress(current: number, limit: number): number {
    return Math.min(current / limit, 1);
  }

  it('should be 0 at start', () => {
    expect(calcProgress(0, 32400)).toBe(0);
  });

  it('should be 0.5 at half', () => {
    expect(calcProgress(16200, 32400)).toBe(0.5);
  });

  it('should cap at 1', () => {
    expect(calcProgress(40000, 32400)).toBe(1);
  });

  it('should calculate session progress', () => {
    expect(calcProgress(8100, 16200)).toBe(0.5);
  });
});

describe('DrivingTimer — warnings', () => {
  const SESSION_LIMIT = 16200; // 4.5h
  const DAILY_LIMIT = 32400;   // 9h

  function getWarnings(sessionSec: number, totalSec: number): string[] {
    const warnings: string[] = [];
    if (sessionSec >= SESSION_LIMIT - 1800) warnings.push('⚠️ 30dk kala uyarisi');
    if (totalSec >= DAILY_LIMIT - 3600) warnings.push('🛑 1 saat kala uyarisi');
    if (sessionSec >= SESSION_LIMIT) warnings.push('🔴 Limit asildi!');
    return warnings;
  }

  it('should have no warnings at start', () => {
    expect(getWarnings(0, 0)).toHaveLength(0);
  });

  it('should warn 30min before session limit', () => {
    expect(getWarnings(14400, 0)).toContain('⚠️ 30dk kala uyarisi');
  });

  it('should warn 1h before daily limit', () => {
    expect(getWarnings(0, 29000)).toContain('🛑 1 saat kala uyarisi');
  });

  it('should warn when limit exceeded', () => {
    const w = getWarnings(16300, 0);
    expect(w).toContain('🔴 Limit asildi!');
  });
});
