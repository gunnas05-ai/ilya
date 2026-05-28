import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { BlockchainAnchor } from './blockchain-anchor.entity';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);

  constructor(
    @InjectRepository(BlockchainAnchor)
    private anchorRepo: Repository<BlockchainAnchor>,
  ) {}

  /** Anchor a document to the KAPTAN private blockchain */
  async anchorDocument(data: {
    documentId: string;
    documentType: string;
    content: string | Buffer;
  }): Promise<BlockchainAnchor> {
    const documentHash = this.sha512(data.content);
    const previousAnchor = await this.anchorRepo.findOne({
      order: { blockIndex: 'DESC' },
      where: {},
    });

    const blockIndex = (previousAnchor?.blockIndex || 0) + 1;
    const previousBlockHash = previousAnchor?.chainHash || '00000000000000000000000000000000';
    const chainHash = this.sha512(previousBlockHash + documentHash + String(blockIndex));
    const merkleRoot = this.sha512(documentHash + chainHash);

    const anchor = this.anchorRepo.create({
      documentId: data.documentId,
      documentType: data.documentType,
      documentHash,
      chainHash,
      blockIndex,
      previousBlockHash,
      merkleRoot,
      anchoredAt: new Date(),
      network: 'KAPTAN_PRIVATE',
    });

    const saved = await this.anchorRepo.save(anchor);
    this.logger.log(`Document ${data.documentId} anchored at block #${blockIndex} → ${chainHash.substring(0, 16)}...`);

    return saved;
  }

  /** Anchor an invoice to blockchain */
  async anchorInvoice(invoiceId: string, invoiceData: any): Promise<BlockchainAnchor> {
    const content = JSON.stringify({
      id: invoiceData.id || invoiceId,
      invoiceNo: invoiceData.invoiceNo,
      type: invoiceData.invoiceType,
      amount: invoiceData.grandTotal,
      vat: invoiceData.vatTotal,
      issueDate: invoiceData.issueDate,
      recipient: invoiceData.customerName,
    });
    return this.anchorDocument({
      documentId: invoiceId,
      documentType: invoiceData.invoiceType || 'e_fatura',
      content,
    });
  }

  /** Verify a document against blockchain anchors */
  async verifyDocument(documentId: string): Promise<{
    verified: boolean;
    anchors: BlockchainAnchor[];
    chainValid: boolean;
    tamperProof: boolean;
  }> {
    const anchors = await this.anchorRepo.find({
      where: { documentId },
      order: { blockIndex: 'ASC' },
    });

    if (anchors.length === 0) {
      return { verified: false, anchors: [], chainValid: false, tamperProof: false };
    }

    // Verify chain integrity
    let chainValid = true;
    for (let i = 1; i < anchors.length; i++) {
      const prev = anchors[i - 1];
      const curr = anchors[i];
      const expectedPrevious = prev.chainHash;
      if (curr.previousBlockHash !== expectedPrevious) {
        chainValid = false;
        this.logger.warn(`Chain broken at block #${curr.blockIndex}!`);
      }
    }

    // Verify merkle roots
    let tamperProof = true;
    for (const anchor of anchors) {
      const expectedMerkle = this.sha512(anchor.documentHash + anchor.chainHash);
      if (anchor.merkleRoot !== expectedMerkle) {
        tamperProof = false;
      }
    }

    return {
      verified: true,
      anchors,
      chainValid,
      tamperProof: chainValid && tamperProof,
    };
  }

  /** Get the latest chain state */
  async getChainInfo() {
    const totalBlocks = await this.anchorRepo.count();
    const lastBlock = await this.anchorRepo.findOne({
      order: { blockIndex: 'DESC' },
      where: {},
    });

    return {
      totalBlocks,
      lastBlockHash: lastBlock?.chainHash || null,
      lastBlockIndex: lastBlock?.blockIndex || 0,
      network: 'KAPTAN_PRIVATE',
      status: 'active',
    };
  }

  private sha512(content: string | Buffer): string {
    return crypto.createHash('sha512').update(content).digest('hex');
  }
}
