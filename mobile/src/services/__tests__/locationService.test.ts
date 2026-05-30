// Test location service logic
describe('LocationService — distance calculation', () => {
  function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
  }

  it('should calculate Istanbul-Ankara ~350km', () => {
    const d = getDistance(41.0082, 28.9784, 39.9334, 32.8597);
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(400);
  });

  it('should be 0 for same point', () => {
    expect(getDistance(41.0, 29.0, 41.0, 29.0)).toBe(0);
  });

  it('should be symmetric', () => {
    const d1 = getDistance(40.0, 30.0, 41.0, 31.0);
    const d2 = getDistance(41.0, 31.0, 40.0, 30.0);
    expect(d1).toBe(d2);
  });
});
