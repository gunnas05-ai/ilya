import { device, by, element, expect } from 'detox';
import { registerUser } from './helpers';

describe('Registration Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should switch to register tab', async () => {
    await element(by.id('register-tab')).tap();
    await expect(element(by.text('Rolünüzü Seçin'))).toBeVisible();
  });

  it('should show 4 role cards', async () => {
    await expect(element(by.id('role-card-FIRMA'))).toBeVisible();
    await expect(element(by.id('role-card-TASIYICI'))).toBeVisible();
    await expect(element(by.id('role-card-ISLETME'))).toBeVisible();
    await expect(element(by.id('role-card-GENEL'))).toBeVisible();
  });

  it('should show error if role not selected', async () => {
    await element(by.id('step-next')).tap();
    await expect(element(by.text('Lütfen bir kullanıcı rolü seçin'))).toBeVisible();
  });

  it('should complete step 1 — role selection', async () => {
    await element(by.id('role-card-TASIYICI')).tap();
    await element(by.id('step-next')).tap();
    await expect(element(by.text('Bilgileriniz'))).toBeVisible();
  });

  it('should validate step 2 fields', async () => {
    await element(by.id('step-next')).tap();
    // At least one validation error should appear
    await expect(element(by.id('field-error-fullName'))).toBeVisible();
    await expect(element(by.id('field-error-phone'))).toBeVisible();
    await expect(element(by.id('field-error-email'))).toBeVisible();
    await expect(element(by.id('field-error-password'))).toBeVisible();
  });

  it('should complete step 2 with valid data', async () => {
    await element(by.id('input-fullName')).typeText('Test Kullanici');
    await element(by.id('input-phone')).typeText('05321234567');
    await element(by.id('input-email')).typeText('test-register@kaptan.com');
    await element(by.id('input-password')).typeText('test123456');
    await element(by.id('checkbox-kvkk')).tap();
    await element(by.id('step-next')).tap();
    await expect(element(by.text('Taşıyıcı / Sürücü'))).toBeVisible();
  });

  it('should complete step 3 — role specifics', async () => {
    await element(by.id('input-licenseType')).typeText('E Sınıfı');
    await element(by.id('input-vehicleType')).typeText('TIR');
    await element(by.id('input-plateNumber')).typeText('34TEST123');
    await element(by.id('step-submit')).tap();
    await expect(element(by.text('Doğrulama'))).toBeVisible();
  });

  it('should show OTP screen after registration', async () => {
    await expect(element(by.id('otp-input'))).toBeVisible();
    await expect(element(by.id('otp-resend-button'))).toBeVisible();
  });
});
