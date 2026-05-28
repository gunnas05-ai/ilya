import { Injectable, Logger } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require('nodemailer');

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: any;

  constructor() {
    const host = process.env.MAIL_HOST;
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: +(process.env.MAIL_PORT || 587),
        secure: process.env.MAIL_SECURE === 'true',
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });
      this.logger.log(`📧 Email servisi aktif: ${host}`);
    } else {
      this.logger.warn('📧 Email servisi MOCK modunda (MAIL_HOST tanımlı değil)');
    }
  }

  async sendInvoicePdf(
    to: string,
    invoiceNo: string,
    pdfBuffer: Buffer,
    subject?: string,
  ): Promise<boolean> {
    if (!to) {
      this.logger.warn(`E-posta adresi olmadığı için PDF gönderilemedi: ${invoiceNo}`);
      return false;
    }

    if (!this.transporter) {
      this.logger.log(`[MOCK] PDF e-posta: ${invoiceNo} -> ${to}`);
      return true; // Mock success
    }

    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'kaptan@kaptanlojistik.com',
        to,
        subject: subject || `E-Fatura: ${invoiceNo}`,
        text: `Sayın yetkili,\n\n${invoiceNo} numaralı e-faturanız ekte PDF olarak iletilmiştir.\n\nKAPTAN Lojistik Platformu`,
        attachments: [{
          filename: `${invoiceNo}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }],
      });
      this.logger.log(`✅ PDF e-posta gönderildi: ${invoiceNo} -> ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`E-posta gönderim hatası (${invoiceNo}): ${error.message}`);
      return false;
    }
  }

  async sendInvoiceToAccountant(
    to: string,
    invoiceNo: string,
    pdfBuffer: Buffer,
    xmlContent: string,
  ): Promise<boolean> {
    if (!to) return false;

    if (!this.transporter) {
      this.logger.log(`[MOCK] Muhasebeciye PDF+XML: ${invoiceNo} -> ${to}`);
      return true;
    }

    try {
      const attachments: any[] = [{
        filename: `${invoiceNo}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }];

      if (xmlContent) {
        attachments.push({
          filename: `${invoiceNo}.xml`,
          content: Buffer.from(xmlContent, 'utf-8'),
          contentType: 'application/xml',
        });
      }

      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'kaptan@kaptanlojistik.com',
        to,
        subject: `Muhasebe: ${invoiceNo} - E-Fatura (PDF+XML)`,
        text: `Sayın muhasebeci,\n\n${invoiceNo} numaralı e-fatura PDF ve XML dosyaları ekte iletilmiştir.\n\nKAPTAN Lojistik Platformu`,
        attachments,
      });
      this.logger.log(`✅ Muhasebeciye PDF+XML gönderildi: ${invoiceNo} -> ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Muhasebeci e-posta hatası (${invoiceNo}): ${error.message}`);
      return false;
    }
  }

  /** Send accountant invitation email */
  async sendAccountantInvite(
    to: string,
    inviteCode: string,
    inviterName: string,
  ): Promise<boolean> {
    if (!to) return false;

    if (!this.transporter) {
      this.logger.log(`[MOCK] Muhasebeci daveti: ${inviteCode} -> ${to}`);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'kaptan@kaptanlojistik.com',
        to,
        subject: 'KAPTAN Platformu - Muhasebeci Daveti',
        text: `Sayın yetkili,\n\n${inviterName} sizi KAPTAN Lojistik Platformu'nda muhasebeci olarak yetkilendirmek istiyor.\n\nDavet kodunuz: ${inviteCode}\n\nBu kodu mobil uygulamada "Davet Kabul Et" ekranında kullanabilirsiniz.\n\nKAPTAN Lojistik Platformu`,
      });
      this.logger.log(`✅ Muhasebeci daveti gönderildi: ${inviteCode} -> ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Muhasebeci davet hatası: ${error.message}`);
      return false;
    }
  }
}
