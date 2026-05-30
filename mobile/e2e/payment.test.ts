import { device, by, element, expect } from 'detox';
import { loginAs, navigateTo } from './helpers';

describe('Payment & Wallet Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAs('test@kaptan.com', 'test123');
  });

  it('should navigate to wallet', async () => {
    await navigateTo(['tab-Profile', 'menu-wallet']);
    await expect(element(by.id('wallet-screen'))).toBeVisible();
  });

  it('should show wallet balance', async () => {
    await expect(element(by.id('wallet-balance'))).toBeVisible();
    await expect(element(by.id('wallet-escrow-balance'))).toBeVisible();
  });

  it('should show transaction history', async () => {
    await expect(element(by.id('wallet-transactions'))).toBeVisible();
  });

  it('should show withdraw button', async () => {
    await expect(element(by.id('wallet-withdraw-button'))).toBeVisible();
  });

  it('should navigate to saved cards', async () => {
    await navigateTo(['tab-Profile', 'menu-savedCards']);
    await expect(element(by.id('saved-cards-screen'))).toBeVisible();
  });
});
