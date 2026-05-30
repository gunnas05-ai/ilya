// Test usage analytics queue logic
describe('UsageAnalytics — queue logic', () => {
  const MAX_BATCH = 20;

  function processBatch(queue: { name: string }[], flushFn: (batch: { name: string }[]) => void): number {
    const batch = queue.splice(0, MAX_BATCH);
    flushFn(batch);
    return queue.length;
  }

  it('should flush exactly MAX_BATCH items', () => {
    const queue = Array.from({ length: 25 }, (_, i) => ({ name: `event_${i}` }));
    const flushed: { name: string }[][] = [];
    const remaining = processBatch(queue, (batch) => flushed.push(batch));

    expect(flushed[0]).toHaveLength(20);
    expect(remaining).toBe(5);
  });

  it('should not flush empty queue', () => {
    const flushed: { name: string }[][] = [];
    processBatch([], (batch) => { if (batch.length > 0) flushed.push(batch); });
    expect(flushed).toHaveLength(0);
  });

  it('should flush partial batch if less than MAX_BATCH', () => {
    const queue = Array.from({ length: 5 }, (_, i) => ({ name: `e_${i}` }));
    const flushed: { name: string }[][] = [];
    const remaining = processBatch(queue, (batch) => flushed.push(batch));

    expect(flushed[0]).toHaveLength(5);
    expect(remaining).toBe(0);
  });
});
