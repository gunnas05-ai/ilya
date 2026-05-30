describe('APP_CONFIG', () => {
  let APP_CONFIG: any;
  let isFeatureEnabled: any;

  beforeAll(() => {
    // __DEV__ is true in jest
    const mod = require('../config');
    APP_CONFIG = mod.APP_CONFIG;
    isFeatureEnabled = mod.isFeatureEnabled;
  });

  it('should have env set to development in tests', () => {
    expect(APP_CONFIG.env).toBe('development');
  });

  it('should have apiBaseUrl defined', () => {
    expect(APP_CONFIG.apiBaseUrl).toBeTruthy();
    expect(APP_CONFIG.apiBaseUrl).toContain('192.168.1.34');
  });

  it('should have wsUrl derived from apiBaseUrl', () => {
    expect(APP_CONFIG.wsUrl).toBe('http://192.168.1.34:3000');
  });

  it('should have feature flags as booleans', () => {
    const flags = APP_CONFIG.featureFlags;
    expect(typeof flags.enableAIMatching).toBe('boolean');
    expect(typeof flags.enableVoiceCommands).toBe('boolean');
    expect(typeof flags.enableEscrow).toBe('boolean');
  });

  it('isFeatureEnabled should work', () => {
    expect(isFeatureEnabled('enableEscrow')).toBe(true);
    expect(isFeatureEnabled('enableVoiceCommands')).toBe(true);
  });

  it('should have logLevel debug in development', () => {
    expect(APP_CONFIG.logLevel).toBe('debug');
  });
});
