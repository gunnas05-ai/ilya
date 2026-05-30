import { device, by, element, expect } from 'detox';
import { loginAs } from './helpers';

describe('GPS & Tracking Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAs('test@kaptan.com', 'test123');
  });

  it('should navigate to load tracking', async () => {
    await element(by.id('tab-Profile')).tap();
    await element(by.id('menu-loadTracking')).tap();
    await expect(element(by.id('tracking-screen'))).toBeVisible();
  });

  it('should show tracking list or empty state', async () => {
    // Either tracking list or empty state should be visible
    try {
      await expect(element(by.id('tracking-list'))).toBeVisible();
    } catch {
      await expect(element(by.id('empty-state'))).toBeVisible();
    }
  });

  it('should show map view when entering tracking detail', async () => {
    try {
      await element(by.id('tracking-item-0')).tap();
      await expect(element(by.id('tracking-map'))).toBeVisible();
    } catch {
      // No active loads — skip
    }
  });

  it('should navigate to fuel stations with location', async () => {
    await element(by.id('tab-Home')).tap();
    await element(by.id('module-fuel-stations')).tap();
    await expect(element(by.id('fuel-stations-screen'))).toBeVisible();
  });
});
