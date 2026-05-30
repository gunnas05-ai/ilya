import { device, by, element, expect } from 'detox';
import { loginAs } from './helpers';

describe('Wallet Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAs('test@kaptan.com', 'test123');
  });

  it('should show wallet with balance', async () => {
    await element(by.id('tab-Profile')).tap();
    await element(by.id('menu-wallet')).tap();
    await expect(element(by.id('wallet-screen'))).toBeVisible();
    await expect(element(by.id('wallet-available-balance'))).toBeVisible();
    await expect(element(by.id('wallet-escrow-balance'))).toBeVisible();
  });

  it('should navigate to billing history', async () => {
    await element(by.id('tab-Profile')).tap();
    await element(by.id('menu-billingHistory')).tap();
    await expect(element(by.id('billing-history-screen'))).toBeVisible();
  });

  it('should navigate to credit shop', async () => {
    await element(by.id('tab-Profile')).tap();
    await element(by.id('menu-creditShop')).tap();
    await expect(element(by.id('credit-shop-screen'))).toBeVisible();
  });

  it('should navigate to subscription', async () => {
    await element(by.id('tab-Profile')).tap();
    await element(by.id('menu-subscription')).tap();
    await expect(element(by.id('subscription-screen'))).toBeVisible();
  });
});
