import { Injectable, Logger } from '@nestjs/common';

/**
 * GİB Entegratör API servisi.
 *
 * Gerçek bir GİB entegratörüne XML gönderir. Ortam değişkenleri:
 *   GIB_API_URL      — Entegratör endpoint'i (default: https://gib-entegrator.example.com/api)
 *   GIB_API_KEY      — API anahtarı
 *   GIB_MOCK_MODE    — "true" ise gerçek API çağrısı yapmaz (geliştirme)
 */
@Injectable()
export class GibApiService {
  private readonly logger = new Logger(GibApiService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly mockMode: boolean;

  constructor() {
    this.apiUrl = process.env.GIB_API_URL || 'https://gib-entegrator.example.com/api';
    this.apiKey = process.env.GIB_API_KEY || '';
    this.mockMode = process.env.GIB_MOCK_MODE !== 'false';
  }

  async sendInvoice(
    xmlContent: string,
    ettn: string,
    invoiceNo: string,
  ): Promise<{ success: boolean; responseCode: string; responseBody: string }> {
    if (this.mockMode) {
      this.logger.log(`[MOCK] GİB'e gönderim simüle edildi: ${invoiceNo} (ETTN: ${ettn})`);
      return {
        success: true,
        responseCode: '200',
        responseBody: JSON.stringify({ status: 'accepted', ettn, message: 'Belge GİB\'e iletilmiştir (simülasyon)' }),
      };
    }

    try {
      const response = await fetch(`${this.apiUrl}/invoice/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-ETTN': ettn,
        },
        body: xmlContent,
      });

      const responseBody = await response.text();
      return {
        success: response.ok,
        responseCode: String(response.status),
        responseBody,
      };
    } catch (error: any) {
      this.logger.error(`GİB API hatası: ${error.message}`);
      return {
        success: false,
        responseCode: '500',
        responseBody: JSON.stringify({ error: error.message }),
      };
    }
  }

  async checkStatus(ettn: string): Promise<{ status: string; detail: string }> {
    if (this.mockMode) {
      return { status: 'sent', detail: 'Belge GİB sisteminde (simülasyon)' };
    }

    try {
      const response = await fetch(`${this.apiUrl}/invoice/status/${ettn}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      const data = await response.json();
      return { status: data.status || 'unknown', detail: JSON.stringify(data) };
    } catch (error: any) {
      this.logger.error(`GİB durum sorgulama hatası: ${error.message}`);
      return { status: 'unknown', detail: error.message };
    }
  }
}
