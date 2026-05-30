import { device, by, element, expect } from 'detox';
import { loginAs } from './helpers';

describe('E-Invoice Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAs('test@kaptan.com', 'test123');
  });

  it('should navigate to e-documents list', async () => {
    await element(by.id('tab-Profile')).tap();
    await element(by.id('menu-invoiceList')).tap();
    await expect(element(by.id('invoice-list-screen'))).toBeVisible();
  });

  it('should show invoice list or empty state', async () => {
    try {
      await expect(element(by.id('invoice-list'))).toBeVisible();
    } catch {
      await expect(element(by.id('empty-state'))).toBeVisible();
    }
  });

  it('should navigate to create invoice', async () => {
    await element(by.id('tab-Profile')).tap();
    await element(by.id('menu-invoiceCreate')).tap();
    await expect(element(by.id('invoice-create-screen'))).toBeVisible();
  });

  it('should navigate to accountant dashboard', async () => {
    await element(by.id('tab-Profile')).tap();
    await element(by.id('menu-accountantDashboard')).tap();
    await expect(element(by.id('accountant-dashboard-screen'))).toBeVisible();
  });

  it('should navigate to tax dashboard', async () => {
    await element(by.id('tab-Profile')).tap();
    await element(by.id('menu-taxDashboard')).tap();
    await expect(element(by.id('tax-dashboard-screen'))).toBeVisible();
  });
});
