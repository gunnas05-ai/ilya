import { loadStep1Schema, loadStep3Schema, expenseSchema } from '../validations';

describe('loadStep1Schema', () => {
  it('validates a complete step 1 form', () => {
    const data = { title: 'Test Yükü', loadType: 'Tam Yük' as const, originCity: 'İstanbul', originAddress: 'Kadıköy', destCity: 'Ankara', destAddress: 'Çankaya', contactName: 'Ali', contactPhone: '05321234567', loadingDate: '2026-06-01', deliveryDate: '2026-06-02' };
    expect(loadStep1Schema.safeParse(data).success).toBe(true);
  });
  it('rejects short title', () => {
    expect(loadStep1Schema.safeParse({ title: 'Ab', loadType: 'Tam Yük', originCity: 'A', originAddress: 'B', destCity: 'C', destAddress: 'D', contactName: 'E', contactPhone: '05321234567', loadingDate: '2026-06-01', deliveryDate: '2026-06-02' }).success).toBe(false);
  });
  it('rejects delivery before pickup', () => {
    expect(loadStep1Schema.safeParse({ title: 'Test Yükü', loadType: 'Tam Yük', originCity: 'A', originAddress: 'B', destCity: 'C', destAddress: 'D', contactName: 'E', contactPhone: '05321234567', loadingDate: '2026-06-02', deliveryDate: '2026-06-01' }).success).toBe(false);
  });
});

describe('loadStep3Schema', () => {
  it('validates fixed pricing', () => {
    expect(loadStep3Schema.safeParse({ pricingType: 'fixed', price: '10000' }).success).toBe(true);
  });
  it('rejects fixed pricing without price', () => {
    expect(loadStep3Schema.safeParse({ pricingType: 'fixed', price: '' }).success).toBe(false);
  });
  it('validates tonnage pricing', () => {
    expect(loadStep3Schema.safeParse({ pricingType: 'tonnage', tonnage: '20', pricePerTon: '500' }).success).toBe(true);
  });
});

describe('expenseSchema', () => {
  it('validates a valid expense', () => {
    expect(expenseSchema.safeParse({ amount: 500, description: 'Yakıt' }).success).toBe(true);
  });
  it('rejects negative amount', () => {
    expect(expenseSchema.safeParse({ amount: -100, description: 'Test' }).success).toBe(false);
  });
  it('rejects empty description', () => {
    expect(expenseSchema.safeParse({ amount: 100, description: '' }).success).toBe(false);
  });
});
