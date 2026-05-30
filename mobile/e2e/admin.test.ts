import { device, by, element, expect } from 'detox';
import { loginAs } from './helpers';

describe('Admin Panel Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    // Admin olarak giris yap
    await loginAs('admin@kaptan.com', 'admin123');
  });

  it('should show admin panel in menu for admin user', async () => {
    await element(by.id('fab-menu-button')).tap();
    await expect(element(by.id('fab-admin-panel'))).toBeVisible();
  });

  it('should navigate to test center', async () => {
    await element(by.id('fab-test-center')).tap();
    await expect(element(by.id('test-center-screen'))).toBeVisible();
    await expect(element(by.id('test-stats'))).toBeVisible();
  });

  it('should show test run buttons', async () => {
    await expect(element(by.id('btn-run-all-tests'))).toBeVisible();
    await expect(element(by.id('btn-health-check'))).toBeVisible();
  });

  it('should navigate to permission matrix', async () => {
    await element(by.id('fab-menu-button')).tap();
    await element(by.id('fab-permission-matrix')).tap();
    await expect(element(by.id('permission-matrix-screen'))).toBeVisible();
  });

  it('should show role tabs in permission matrix', async () => {
    await expect(element(by.id('role-tabs'))).toBeVisible();
    await expect(element(by.id('btn-save-permissions'))).toBeVisible();
  });

  it('should navigate to audit logs', async () => {
    await element(by.id('tab-Profile')).tap();
    await element(by.id('menu-auditLog')).tap();
    await expect(element(by.id('audit-log-screen'))).toBeVisible();
  });

  it('should show security center', async () => {
    await element(by.id('tab-Profile')).tap();
    await element(by.id('menu-securityCenter')).tap();
    await expect(element(by.id('security-center-screen'))).toBeVisible();
  });

  it('should navigate to system settings', async () => {
    await element(by.id('tab-Profile')).tap();
    await element(by.id('menu-systemSettings')).tap();
    await expect(element(by.id('system-settings-screen'))).toBeVisible();
  });
});
