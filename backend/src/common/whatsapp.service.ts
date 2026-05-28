import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppSettings } from './whatsapp-settings.entity';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    @InjectRepository(WhatsAppSettings)
    private settingsRepo: Repository<WhatsAppSettings>,
  ) {}

  async getSettings(): Promise<WhatsAppSettings> {
    let settings = await this.settingsRepo.findOne({ where: { id: 'default' } });
    if (!settings) {
      settings = this.settingsRepo.create({ id: 'default' });
      settings = await this.settingsRepo.save(settings);
    }
    return settings;
  }

  async updateSettings(data: Partial<WhatsAppSettings>): Promise<WhatsAppSettings> {
    await this.settingsRepo.update('default', data);
    return this.getSettings();
  }

  /** WhatsApp mesajı gönder (WhatsApp Cloud API) */
  async sendMessage(to: string, message: string): Promise<boolean> {
    const settings = await this.getSettings();
    if (!settings.enabled || !settings.accessToken || !settings.phoneNumberId) {
      this.logger.warn('WhatsApp yapılandırılmamış veya devre dışı');
      return false;
    }

    try {
      const url = `https://graph.facebook.com/v18.0/${settings.phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { body: message },
        }),
      });

      const data = await response.json();
      if (data.messages?.[0]?.id) {
        this.logger.log(`✅ WhatsApp mesajı gönderildi: ${to}`);
        return true;
      }
      this.logger.error(`WhatsApp API hatası: ${JSON.stringify(data)}`);
      return false;
    } catch (err) {
      this.logger.error(`WhatsApp gönderim hatası: ${err.message}`);
      return false;
    }
  }

  /** Yük ilanını WhatsApp'ta paylaş */
  async shareLoad(phone: string, load: any): Promise<boolean> {
    const message = [
      `🚛 *KAPTAN — Yeni Yük İlanı*`,
      ``,
      `📦 *${load.title || 'Yük'}*`,
      `📍 *Rota:* ${load.fromCity || '?'} → ${load.toCity || '?'}`,
      `⚖️ *Ağırlık:* ${load.weight || 'Belirtilmemiş'}`,
      `🚛 *Araç:* ${load.vehicleType || 'Belirtilmemiş'}`,
      `💰 *Fiyat:* ${Number(load.totalPrice || load.price || 0).toLocaleString('tr-TR')} ₺`,
      ``,
      `🔗 Detaylar ve teklif için: https://kaptan.app/load/${load.id}`,
      ``,
      `📱 *KAPTAN Lojistik Platformu*`,
    ].join('\n');

    return this.sendMessage(phone, message);
  }

  /** Takip linkini WhatsApp'ta paylaş */
  async shareTracking(phone: string, tracking: any): Promise<boolean> {
    const message = [
      `📍 *KAPTAN — Canlı Yük Takibi*`,
      ``,
      `🚛 ${tracking.load?.title || 'Sevkiyat'}`,
      `📍 ${tracking.current?.lat?.toFixed(4)}, ${tracking.current?.lng?.toFixed(4)}`,
      `⏱️ *ETA:* ${tracking.eta || 'Hesaplanıyor...'}`,
      ``,
      `🔗 *Canlı Takip:* ${tracking.shareUrl || 'https://kaptan.app/track/' + tracking.loadId}`,
      ``,
      `📱 *KAPTAN Lojistik Platformu*`,
    ].join('\n');

    return this.sendMessage(phone, message);
  }

  /** Ödeme onayı bildirimi */
  async sendPaymentConfirmation(phone: string, data: { amount: number; loadTitle: string }): Promise<boolean> {
    const message = [
      `✅ *Ödeme Onayı*`,
      ``,
      `📦 ${data.loadTitle}`,
      `💰 *Ödenen Tutar:* ${Number(data.amount).toLocaleString('tr-TR')} ₺`,
      ``,
      `Ödemeniz hesabınıza aktarılmıştır.`,
      ``,
      `📱 *KAPTAN Lojistik Platformu*`,
    ].join('\n');

    return this.sendMessage(phone, message);
  }

  /** Test mesajı gönder (admin panelden) */
  async sendTestMessage(phone: string): Promise<{ success: boolean; message: string }> {
    const settings = await this.getSettings();
    if (!settings.enabled) return { success: false, message: 'WhatsApp entegrasyonu devre dışı.' };
    if (!settings.accessToken) return { success: false, message: 'Access Token tanımlanmamış.' };

    const sent = await this.sendMessage(phone, '🧪 *KAPTAN Test Mesajı*\n\nWhatsApp entegrasyonu başarıyla yapılandırıldı! ✅');
    return sent
      ? { success: true, message: `Test mesajı ${phone} numarasına gönderildi.` }
      : { success: false, message: 'Mesaj gönderilemedi. API kimlik bilgilerini kontrol edin.' };
  }
}
