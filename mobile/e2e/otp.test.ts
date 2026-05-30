import { device, by, element, expect } from 'detox';

describe('OTP Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should show OTP input after registration', async () => {
    await element(by.id('register-tab')).tap();
    // Quick register to get to OTP screen
    await element(by.id('role-card-GENEL')).tap();
    await element(by.id('step-next')).tap();
    await element(by.id('input-fullName')).typeText('OTP Test Kullanici');
    await element(by.id('input-phone')).typeText('05321112233');
    await element(by.id('input-email')).typeText('otp-test@kaptan.com');
    await element(by.id('input-password')).typeText('test123456');
    await element(by.id('checkbox-kvkk')).tap();
    await element(by.id('step-next')).tap();
    await element(by.id('step-submit')).tap();

    await expect(element(by.id('otp-screen'))).toBeVisible();
    await expect(element(by.id('otp-input'))).toBeVisible();
  });

  it('should show error for short OTP', async () => {
    await element(by.id('otp-input')).typeText('123');
    await element(by.id('otp-verify-button')).tap();
    await expect(element(by.text('6 haneli doğrulama kodunu girin'))).toBeVisible();
  });

  it('should show resend button', async () => {
    await expect(element(by.id('otp-resend-button'))).toBeVisible();
  });

  it('should resend OTP on button tap', async () => {
    await element(by.id('otp-resend-button')).tap();
    await expect(element(by.text('Doğrulama kodu tekrar gönderildi'))).toBeVisible();
  });
});
