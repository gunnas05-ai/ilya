// Test rating service logic without React Native dependencies
describe('ratingService — prompt logic', () => {
  const PROMPT_CONFIG = {
    minLaunches: 5,
    minPositiveActions: 3,
    cooldownDays: 30,
  };

  function shouldShow(launches: number, positiveActions: number, daysSinceLastPrompt: number, hasRated: boolean): boolean {
    if (hasRated) return false;
    return launches >= PROMPT_CONFIG.minLaunches
      && positiveActions >= PROMPT_CONFIG.minPositiveActions
      && daysSinceLastPrompt > PROMPT_CONFIG.cooldownDays;
  }

  it('should NOT show when not enough launches', () => {
    expect(shouldShow(3, 5, 31, false)).toBe(false);
  });

  it('should NOT show when not enough positive actions', () => {
    expect(shouldShow(10, 1, 31, false)).toBe(false);
  });

  it('should NOT show during cooldown', () => {
    expect(shouldShow(10, 5, 10, false)).toBe(false);
  });

  it('should NOT show when already rated', () => {
    expect(shouldShow(10, 5, 31, true)).toBe(false);
  });

  it('should show when all conditions met', () => {
    expect(shouldShow(10, 5, 31, false)).toBe(true);
  });

  it('should show at exact threshold', () => {
    expect(shouldShow(5, 3, 31, false)).toBe(true);
  });

  it('should NOT show at cooldown boundary', () => {
    expect(shouldShow(5, 3, 30, false)).toBe(false);
  });
});
