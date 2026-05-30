import { device, by, element, expect } from 'detox';
import { loginAs } from './helpers';

describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should show login screen on first launch', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible();
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
    await expect(element(by.id('login-button'))).toBeVisible();
  });

  it('should show error for empty email', async () => {
    await element(by.id('login-button')).tap();
    await expect(element(by.text('E-posta adresinizi girin'))).toBeVisible();
  });

  it('should show error for invalid email format', async () => {
    await element(by.id('email-input')).typeText('invalid-email');
    await element(by.id('password-input')).typeText('123456');
    await element(by.id('login-button')).tap();
    await expect(element(by.text('Geçerli bir e-posta adresi girin'))).toBeVisible();
  });

  it('should login with valid credentials', async () => {
    await element(by.id('email-input')).clearText();
    await element(by.id('password-input')).clearText();
    await loginAs('test@kaptan.com', 'test123');
    await expect(element(by.id('home-screen'))).toBeVisible();
    await expect(element(by.text('KAPTAN'))).toBeVisible();
  });

  it('should allow guest mode access', async () => {
    await device.launchApp({ newInstance: true });
    await element(by.id('guest-button')).tap();
    await expect(element(by.id('home-screen'))).toBeVisible();
  });
});
