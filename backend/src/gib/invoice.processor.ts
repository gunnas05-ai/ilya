import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { GibService } from './gib.service';

@Processor('invoice-processing')
export class InvoiceProcessor {
  constructor(private readonly gibService: GibService) {}

  @Process('create-gib-invoice')
  async handleInvoiceCreation(job: Job<{ loadId: string; invoiceData: any }>) {
    console.log(`[BullMQ] Asenkron Fatura İşleniyor (Job ID: ${job.id}, Load ID: ${job.data.loadId})`);
    
    try {
      // Ağır GİB REST API / XML şema oluşturma süreçleri arka planda asenkron çalışır
      await this.gibService.createInvoice(job.data.invoiceData);
      console.log(`[BullMQ] Fatura başarıyla oluşturuldu.`);
    } catch (error) {
      console.error(`[BullMQ] Fatura oluşturma hatası:`, error);
      throw error;
    }
  }
}
