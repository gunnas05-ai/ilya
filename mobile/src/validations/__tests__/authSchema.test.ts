import {
  loginSchema,
  step1Schema,
  step2Schema,
  otpSchema,
  step3FirmaSchema,
  step3TasiyiciSchema,
} from '../authSchema';

describe('loginSchema', () => {
  it('should accept valid login data', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '123456' });
    expect(result.success).toBe(true);
  });

  it('should reject empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: '123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email');
    }
  });

  it('should reject invalid email format', () => {
    const result = loginSchema.safeParse({ email: 'notanemail', password: '123' });
    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('step1Schema (role selection)', () => {
  it('should accept valid role', () => {
    const result = step1Schema.safeParse({ selectedRole: 'FIRMA' });
    expect(result.success).toBe(true);
  });

  it('should accept TASIYICI role', () => {
    const result = step1Schema.safeParse({ selectedRole: 'TASIYICI' });
    expect(result.success).toBe(true);
  });

  it('should reject missing role', () => {
    const result = step1Schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject invalid role', () => {
    const result = step1Schema.safeParse({ selectedRole: 'INVALID' });
    expect(result.success).toBe(false);
  });
});

describe('step2Schema (common info)', () => {
  const validData = {
    fullName: 'Test Kullanici',
    phone: '05321234567',
    email: 'test@example.com',
    password: '123456',
    kvkkAccepted: true,
  };

  it('should accept valid data', () => {
    const result = step2Schema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject missing fullName', () => {
    const result = step2Schema.safeParse({ ...validData, fullName: '' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid phone format', () => {
    const result = step2Schema.safeParse({ ...validData, phone: '12345' });
    expect(result.success).toBe(false);
  });

  it('should reject phone without 05 prefix', () => {
    const result = step2Schema.safeParse({ ...validData, phone: '02121234567' });
    expect(result.success).toBe(false);
  });

  it('should reject short password', () => {
    const result = step2Schema.safeParse({ ...validData, password: '12' });
    expect(result.success).toBe(false);
  });

  it('should reject KVKK not accepted', () => {
    const result = step2Schema.safeParse({ ...validData, kvkkAccepted: false });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email', () => {
    const result = step2Schema.safeParse({ ...validData, email: 'bad-email' });
    expect(result.success).toBe(false);
  });
});

describe('otpSchema', () => {
  it('should accept 6-digit OTP', () => {
    const result = otpSchema.safeParse({ otpCode: '123456' });
    expect(result.success).toBe(true);
  });

  it('should reject short OTP', () => {
    const result = otpSchema.safeParse({ otpCode: '123' });
    expect(result.success).toBe(false);
  });

  it('should reject empty OTP', () => {
    const result = otpSchema.safeParse({ otpCode: '' });
    expect(result.success).toBe(false);
  });
});

describe('step3FirmaSchema', () => {
  it('should accept valid company data', () => {
    const result = step3FirmaSchema.safeParse({
      companyTitle: 'Test Ltd Sti',
      taxNo: '1234567890',
      taxOfficeName: 'Istanbul',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing company title', () => {
    const result = step3FirmaSchema.safeParse({ companyTitle: '', taxNo: '123', taxOfficeName: 'x' });
    expect(result.success).toBe(false);
  });
});

describe('step3TasiyiciSchema', () => {
  it('should accept valid driver data', () => {
    const result = step3TasiyiciSchema.safeParse({
      licenseType: 'E',
      vehicleType: 'TIR',
      plateNumber: '34ABC123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing plate', () => {
    const result = step3TasiyiciSchema.safeParse({
      licenseType: 'E',
      vehicleType: 'TIR',
      plateNumber: '',
    });
    expect(result.success).toBe(false);
  });
});
