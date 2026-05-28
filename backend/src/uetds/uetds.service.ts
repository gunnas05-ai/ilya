import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { UetdsTransaction, UetdsStatus } from './uetds-transaction.entity';

@Injectable()
export class UetdsService {
  private readonly logger = new Logger(UetdsService.name);

  constructor(
    @InjectRepository(UetdsTransaction)
    private uetdsRepo: Repository<UetdsTransaction>,
    @InjectQueue('uetds-queue') private uetdsQueue: Queue,
  ) {}

  async queueUetdsNotification(loadId: string, payload: any) {
    const transaction = this.uetdsRepo.create({
      loadId,
      payload,
      status: UetdsStatus.PENDING,
    });
    const saved = await this.uetdsRepo.save(transaction);

    // Add to BullMQ queue for async processing
    await this.uetdsQueue.add(
      'process-uetds',
      { transactionId: saved.id, payload },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 60000, // 1 min, 2 min, 4 min, 8 min...
        },
        removeOnComplete: true,
      },
    );

    this.logger.log(`UETDS notification queued for load ${loadId} with TxID ${saved.id}`);
    return saved;
  }

  async sendToUetdsApi(payload: any): Promise<string> {
    // Mocking the Ulaştırma Bakanlığı UETDS API
    // In production, this would use @nestjs/axios to send MTLS/SOAP requests
    this.logger.debug('Sending payload to UETDS API...', payload);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate random failure to test exponential retry
        if (Math.random() > 0.8) {
          reject(new Error('UETDS_API_TIMEOUT'));
        } else {
          // Return a mock reference number
          const refNo = 'UETDS-' + Math.random().toString(36).substring(2, 10).toUpperCase();
          resolve(refNo);
        }
      }, 1500);
    });
  }

  async markAsSuccess(transactionId: string, referenceNo: string) {
    await this.uetdsRepo.update(transactionId, {
      status: UetdsStatus.SUCCESS,
      referenceNo,
      updatedAt: new Date(),
    });
    this.logger.log(`UETDS Transaction ${transactionId} SUCCESS. RefNo: ${referenceNo}`);
  }

  async markAsFailed(transactionId: string, error: string, attempt: number) {
    await this.uetdsRepo.update(transactionId, {
      status: attempt >= 5 ? UetdsStatus.FAILED : UetdsStatus.PENDING,
      errorMessage: error,
      retryCount: attempt,
      updatedAt: new Date(),
    });
    this.logger.error(`UETDS Transaction ${transactionId} FAILED. Error: ${error}`);
  }
}
