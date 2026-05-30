import { device, by, element, expect } from 'detox';
import { loginAs, navigateTo } from './helpers';

describe('Load Creation Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAs('test@kaptan.com', 'test123');
  });

  it('should navigate to load create tab', async () => {
    await element(by.id('tab-LoadCreateTab')).tap();
    await expect(element(by.text('Sevkiyat Ekle'))).toBeVisible();
  });

  it('should show step 1 common fields', async () => {
    await expect(element(by.id('picker-loadType'))).toBeVisible();
    await expect(element(by.id('input-title'))).toBeVisible();
    await expect(element(by.id('picker-fromCity'))).toBeVisible();
    await expect(element(by.id('picker-toCity'))).toBeVisible();
    await expect(element(by.id('input-contactName'))).toBeVisible();
    await expect(element(by.id('input-contactPhone'))).toBeVisible();
    await expect(element(by.id('picker-pickupDate'))).toBeVisible();
    await expect(element(by.id('picker-deliveryDate'))).toBeVisible();
  });

  it('should validate step 1 required fields', async () => {
    await element(by.id('step-next')).tap();
    await expect(element(by.text('Yük türü seçiniz'))).toBeVisible();
  });

  it('should complete step 1', async () => {
    await element(by.id('picker-loadType')).tap();
    await element(by.text('Tam Yük')).tap();
    await element(by.id('input-title')).typeText('Test Yükü - E2E');
    await element(by.id('picker-fromCity')).tap();
    await element(by.text('İstanbul')).tap();
    await element(by.id('picker-toCity')).tap();
    await element(by.text('Ankara')).tap();
    await element(by.id('input-contactName')).typeText('Test Sahibi');
    await element(by.id('input-contactPhone')).typeText('05329876543');
    await element(by.id('step-next')).tap();
    await expect(element(by.text('Yük Detayları'))).toBeVisible();
  });

  it('should complete step 2 — vehicle selection', async () => {
    await element(by.id('picker-vehicleType')).tap();
    await element(by.text('Tenteli TIR')).tap();
    await element(by.id('picker-trailerType')).tap();
    await element(by.text('Tenteli')).tap();
    await element(by.id('input-totalWeight')).typeText('20');
    await element(by.id('step-next')).tap();
    await expect(element(by.text('Fiyatlandırma'))).toBeVisible();
  });

  it('should complete step 3 — pricing', async () => {
    await element(by.id('switch-auction')).tap();
    await element(by.id('switch-escrow')).tap();
    await element(by.id('input-auctionMinPrice')).typeText('15000');
    await element(by.id('input-auctionMaxPrice')).typeText('25000');
    await element(by.id('step-submit')).tap();
    await expect(element(by.text('Yük başarıyla kaydedildi'))).toBeVisible();
  });

  it('should view created load in list', async () => {
    await navigateTo(['tab-LoadAccept']);
    await expect(element(by.id('load-list'))).toBeVisible();
  });
});
