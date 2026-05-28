import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { UetdsService } from './uetds.service';
import { Logger } from '@nestjs/common';

@Processor('uetds-queue')
export class UetdsProcessor {
  private readonly logger = new Logger(UetdsProcessor.name);

  constructor(private readonly uetdsService: UetdsService) {}

  @Process('process-uetds')
  async handleUetdsNotification(job: Job<{ transactionId: string; payload: any }>) {
    this.logger.debug(`Processing UETDS notification Job ${job.id} for Transaction ${job.data.transactionId} (Attempt: ${job.attemptsMade + 1})`);

    try {
      // API call to Ulaştırma Bakanlığı
      const referenceNo = await this.uetdsService.sendToUetdsApi(job.data.payload);
      
      // On success
      await this.uetdsService.markAsSuccess(job.data.transactionId, referenceNo);
      
      return { referenceNo };
    } catch (error: any) {
      this.logger.error(`Failed to process UETDS job ${job.id}: ${error.message}`);
      
      // Mark as failed/pending based on attempt count
      await this.uetdsService.markAsFailed(job.data.transactionId, error.message, job.attemptsMade + 1);
      
      // Throwing error causes BullMQ to retry the job according to the exponential backoff config
      throw error;
    }
  }
}
