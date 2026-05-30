import { device, by, element, expect } from 'detox';
import { loginAs } from './helpers';

describe('Escrow Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAs('test@kaptan.com', 'test123');
  });

  it('should show escrow option in load create', async () => {
    await element(by.id('tab-LoadCreateTab')).tap();
    await expect(element(by.id('switch-escrow'))).toBeVisible();
  });

  it('should toggle escrow on and show escrow info', async () => {
    await element(by.id('switch-escrow')).tap();
    await expect(element(by.text('Güvenli Ödeme (Escrow)'))).toBeVisible();
  });

  it('should show escrow balance in wallet', async () => {
    await element(by.id('tab-Profile')).tap();
    await element(by.id('menu-wallet')).tap();
    await expect(element(by.id('wallet-escrow-balance'))).toBeVisible();
  });

  it('should show escrow badge on loads with escrow', async () => {
    await element(by.id('tab-LoadAccept')).tap();
    // Escrow badge should be visible on loads that have it
    await expect(element(by.id('escrow-badge-0'))).toBeVisible();
  });
});
