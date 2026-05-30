// E2E test yardimci fonksiyonlari
import { by, element, expect } from 'detox';

export async function loginAs(email: string, password: string) {
  await element(by.id('email-input')).typeText(email);
  await element(by.id('password-input')).typeText(password);
  await element(by.id('login-button')).tap();
  // Ana ekranin yuklenmesini bekle
  await expect(element(by.id('home-screen'))).toBeVisible();
}

export async function registerUser(role: string, fullName: string, phone: string, email: string, password: string) {
  // Register tab'ine gec
  await element(by.id('register-tab')).tap();
  // Step 1: Rol secimi
  await element(by.id(`role-card-${role}`)).tap();
  await element(by.id('step-next')).tap();
  // Step 2: Bilgiler
  await element(by.id('input-fullName')).typeText(fullName);
  await element(by.id('input-phone')).typeText(phone);
  await element(by.id('input-email')).typeText(email);
  await element(by.id('input-password')).typeText(password);
  await element(by.id('checkbox-kvkk')).tap();
  await element(by.id('step-next')).tap();
  // Step 3: Rol detayi (role gore degisir)
  await element(by.id('step-submit')).tap();
}

export async function navigateTo(screenPath: string[]) {
  for (const tab of screenPath) {
    await element(by.id(`nav-${tab}`)).tap();
  }
}
