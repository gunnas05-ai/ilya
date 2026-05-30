import { device, by, element, expect } from 'detox';
import { loginAs } from './helpers';

describe('Bid Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAs('test@kaptan.com', 'test123');
  });

  it('should navigate to load accept tab', async () => {
    await element(by.id('tab-LoadAccept')).tap();
    await expect(element(by.id('load-list'))).toBeVisible();
  });

  it('should show load detail with bid button', async () => {
    await element(by.id('load-card-0')).tap();
    await expect(element(by.id('bid-button'))).toBeVisible();
    await expect(element(by.id('load-detail-screen'))).toBeVisible();
  });

  it('should open bid form', async () => {
    await element(by.id('bid-button')).tap();
    await expect(element(by.id('bid-form'))).toBeVisible();
    await expect(element(by.id('bid-amount-input'))).toBeVisible();
    await expect(element(by.id('bid-note-input'))).toBeVisible();
  });

  it('should validate bid amount', async () => {
    await element(by.id('bid-submit')).tap();
    await expect(element(by.text('Geçerli bir teklif tutarı giriniz'))).toBeVisible();
  });

  it('should submit bid successfully', async () => {
    await element(by.id('bid-amount-input')).typeText('20000');
    await element(by.id('bid-note-input')).typeText('E2E test teklifi');
    await element(by.id('bid-submit')).tap();
    await expect(element(by.text('Teklifiniz başarıyla gönderildi'))).toBeVisible();
  });

  it('should show bids in My Bids', async () => {
    await element(by.id('tab-Profile')).tap();
    await element(by.id('menu-myBids')).tap();
    await expect(element(by.id('my-bids-list'))).toBeVisible();
  });
});
