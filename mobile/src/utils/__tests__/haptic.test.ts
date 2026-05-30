// Verify haptic utility exports
describe('haptic utility', () => {
  it('should export all haptic functions', () => {
    const mod = require('../haptic');
    expect(typeof mod.hapticLight).toBe('function');
    expect(typeof mod.hapticMedium).toBe('function');
    expect(typeof mod.hapticSuccess).toBe('function');
    expect(typeof mod.hapticError).toBe('function');
  });
});
