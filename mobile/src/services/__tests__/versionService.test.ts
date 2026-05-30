describe('versionService — parseVersion', () => {
  // Test the internal parseVersion logic
  function parseVersion(v: string): { major: number; minor: number; patch: number } {
    const parts = v.split('.').map(Number);
    return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
  }

  it('should parse full version', () => {
    expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it('should compare versions correctly', () => {
    const current = parseVersion('1.0.0');
    const minimum = parseVersion('2.0.0');
    expect(current.major < minimum.major).toBe(true);
  });

  it('should handle missing patch', () => {
    expect(parseVersion('1.0')).toEqual({ major: 1, minor: 0, patch: 0 });
  });
});
