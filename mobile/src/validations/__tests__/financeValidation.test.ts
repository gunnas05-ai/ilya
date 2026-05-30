// Test finance validation logic
describe('Finance Validation', () => {
  function validateExpense(amount: string): { valid: boolean; error?: string } {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return { valid: false, error: 'Geçerli bir tutar giriniz' };
    if (num > 10000000) return { valid: false, error: 'Tutar 10.000.000 TL\'yi aşamaz' };
    return { valid: true };
  }

  it('should accept valid amount', () => {
    expect(validateExpense('150.50')).toEqual({ valid: true });
  });

  it('should reject empty', () => {
    const r = validateExpense('');
    expect(r.valid).toBe(false);
    expect(r.error).toBeDefined();
  });

  it('should reject zero', () => {
    expect(validateExpense('0').valid).toBe(false);
  });

  it('should reject negative', () => {
    expect(validateExpense('-100').valid).toBe(false);
  });

  it('should reject non-numeric', () => {
    expect(validateExpense('abc').valid).toBe(false);
  });

  it('should reject amount over 10M', () => {
    expect(validateExpense('20000000').valid).toBe(false);
  });

  it('should accept amount up to 10M', () => {
    expect(validateExpense('9999999').valid).toBe(true);
  });
});
