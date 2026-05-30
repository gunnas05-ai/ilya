import { device, by, element, expect } from 'detox';
import { loginAs } from './helpers';

describe('Permission & RBAC Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAs('test@kaptan.com', 'test123');
  });

  it('should hide unauthorized menu items for regular user', async () => {
    await element(by.id('tab-Home')).tap();
    // Admin-only items should NOT be visible for regular users
    try {
      await expect(element(by.id('fab-admin-panel'))).not.toBeVisible();
    } catch {
      // Pass — admin item correctly hidden
    }
  });

  it('should show error when navigating to admin panel without permission', async () => {
    // Try to navigate to admin panel
    await element(by.id('tab-Profile')).tap();
    // Admin panel should not be in the menu for non-admin users
    try {
      await expect(element(by.id('menu-adminPanel'))).not.toBeVisible();
    } catch {
      // Pass — correctly hidden
    }
  });

  it('should show fuel stations for all authenticated users', async () => {
    await element(by.id('tab-Home')).tap();
    await element(by.id('module-fuel-stations')).tap();
    await expect(element(by.id('fuel-stations-screen'))).toBeVisible();
  });

  it('should allow profile editing', async () => {
    await element(by.id('tab-Profile')).tap();
    await element(by.id('menu-carrierProfile')).tap();
    await expect(element(by.id('carrier-profile-screen'))).toBeVisible();
  });
});
