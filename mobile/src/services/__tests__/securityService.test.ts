// Test security service logic
describe('SecurityService — SSL check', () => {
  function isSecureConnection(url: string, isDev: boolean): boolean {
    if (url.startsWith('https://')) return true;
    if (url.startsWith('http://') && !isDev) return false;
    return true;
  }

  it('should accept HTTPS in production', () => {
    expect(isSecureConnection('https://api.kaptanlojistik.com', false)).toBe(true);
  });

  it('should reject HTTP in production', () => {
    expect(isSecureConnection('http://api.kaptanlojistik.com', false)).toBe(false);
  });

  it('should accept HTTP in development', () => {
    expect(isSecureConnection('http://192.168.1.34:3000', true)).toBe(true);
  });

  it('should accept HTTPS in development', () => {
    expect(isSecureConnection('https://localhost', true)).toBe(true);
  });
});
