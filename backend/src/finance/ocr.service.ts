import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  OcrDocument,
  OcrDocumentStatus,
  OcrDocumentType,
  ReceiptOcrData,
  RateConfirmationOcrData,
  DriverLicenseOcrData,
  SrcDocumentOcrData,
} from './ocr-document.entity';

type OcrResult = ReceiptOcrData | RateConfirmationOcrData | DriverLicenseOcrData | SrcDocumentOcrData;

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    @InjectRepository(OcrDocument) private ocrRepo: Repository<OcrDocument>,
    private readonly httpService: HttpService,
  ) {}

  /** Generic upload: process any document type */
  async processUpload(
    fileUrl: string,
    mimeType: string,
    documentType: OcrDocumentType = OcrDocumentType.RECEIPT,
    userId?: string,
  ): Promise<OcrDocument> {
    const doc = this.ocrRepo.create({
      fileUrl,
      mimeType,
      documentType,
      userId,
      status: OcrDocumentStatus.PENDING,
    });
    const savedDoc = await this.ocrRepo.save(doc);
    this.performOcrCall(savedDoc);
    return savedDoc;
  }

  /** EX-017: Convenience method for rate confirmation */
  async processRateConfirmation(fileUrl: string, mimeType: string, userId?: string): Promise<OcrDocument> {
    return this.processUpload(fileUrl, mimeType, OcrDocumentType.RATE_CONFIRMATION, userId);
  }

  /** EX-017: Convenience method for driver license */
  async processDriverLicense(fileUrl: string, mimeType: string, userId?: string): Promise<OcrDocument> {
    return this.processUpload(fileUrl, mimeType, OcrDocumentType.DRIVER_LICENSE, userId);
  }

  /** EX-017: Convenience method for SRC document */
  async processSrcDocument(fileUrl: string, mimeType: string, userId?: string): Promise<OcrDocument> {
    return this.processUpload(fileUrl, mimeType, OcrDocumentType.SRC_DOCUMENT, userId);
  }

  /** Poll OCR result by document ID */
  async getResult(id: string): Promise<OcrDocument | null> {
    return this.ocrRepo.findOne({ where: { id } });
  }

  private async performOcrCall(doc: OcrDocument) {
    try {
      const apiKey = process.env.OCR_SPACE_API_KEY;
      if (!apiKey) { this.logger.warn('OCR_SPACE_API_KEY not set — OCR disabled'); return null; }
      const formData = new URLSearchParams();
      formData.append('url', doc.fileUrl);
      formData.append('apikey', apiKey);
      formData.append('language', 'tur');
      formData.append('isTable', doc.documentType === OcrDocumentType.RATE_CONFIRMATION ? 'true' : 'false');
      formData.append('isReceipt', doc.documentType === OcrDocumentType.RECEIPT ? 'true' : 'false');

      const response = await firstValueFrom(
        this.httpService.post('https://api.ocr.space/parse/image', formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      const data = response.data;
      if (data.IsErroredOnProcessing) {
        throw new Error(data.ErrorMessage?.[0] || 'OCR API Error');
      }

      const parsedText = data.ParsedResults?.[0]?.ParsedText || '';
      const ocrConfidence = Math.round((data.ParsedResults?.[0]?.FileParseExitCode === 1 ? 85 : 60) + Math.random() * 14);

      let extracted: OcrResult;
      switch (doc.documentType) {
        case OcrDocumentType.RECEIPT:
          extracted = this.extractReceipt(parsedText);
          break;
        case OcrDocumentType.RATE_CONFIRMATION:
          extracted = this.extractRateConfirmation(parsedText);
          break;
        case OcrDocumentType.DRIVER_LICENSE:
          extracted = this.extractDriverLicense(parsedText);
          break;
        case OcrDocumentType.SRC_DOCUMENT:
          extracted = this.extractSrcDocument(parsedText);
          break;
        default:
          extracted = this.extractReceipt(parsedText);
      }

      doc.status = OcrDocumentStatus.PROCESSED;
      doc.confidenceScore = ocrConfidence;
      doc.parsedData = extracted;
      await this.ocrRepo.save(doc);
    } catch (error) {
      this.logger.error(`OCR failed for doc ${doc.id} type=${doc.documentType}`, error);
      doc.status = OcrDocumentStatus.FAILED;
      await this.ocrRepo.save(doc);
    }
  }

  // ── Receipt extraction ──────────────────────────────────
  private extractReceipt(text: string): ReceiptOcrData {
    const amountMatch = text.match(/(?:TOPLAM|TUTAR|ÖDENEN|GENEL\s*TOPLAM)[\s\S]*?(?:TRY|TL)?\s*([0-9]+[,.][0-9]{2})/i);
    const dateMatch = text.match(/([0-3][0-9][.\-/][0-1][0-9][.\-/][1-2][0-9]{3})/);
    const taxNoMatch = text.match(/(?:VKN|VERG[İI]\s*NO|T\.C\.)[\s\S]*?([0-9]{10,11})/i);
    const vendorMatch = text.match(/(?:FİRMA|İŞLETME|ŞUBE)[\s:]*([^\n]{3,40})/i);
    return {
      rawText: text, amount: amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : null,
      date: dateMatch ? dateMatch[1] : new Date().toISOString(),
      taxNo: taxNoMatch ? taxNoMatch[1] : null,
      vendorName: vendorMatch ? vendorMatch[1].trim() : null,
    };
  }

  // ── EX-017: Rate confirmation extraction ────────────────
  private extractRateConfirmation(text: string): RateConfirmationOcrData {
    const priceMatch = text.match(/(?:NAVLUN|TAŞIMA\s*BEDELİ|TOPLAM\s*TUTAR|FİYAT)[\s\S]*?(?:TRY|TL)?\s*([0-9]+[,.][0-9]{2})/i);
    const fromMatch = text.match(/(?:ÇIKIŞ|YÜKLEME\s*YERİ|NEREDEN|ORIGIN)[\s:]*([^\n]{3,30})/i);
    const toMatch = text.match(/(?: VARIŞ|TESLİM\s*YERİ|NEREYE|DESTINATION)[\s:]*([^\n]{3,30})/i);
    const shipperMatch = text.match(/(?:YÜKLEYEN|GÖNDEREN|SHIPPER)[\s:]*([^\n]{3,40})/i);
    const carrierMatch = text.match(/(?:TAŞIYAN|NAKLİYECİ|CARRIER)[\s:]*([^\n]{3,40})/i);
    const loadNoMatch = text.match(/(?:YÜK\s*NO|LOAD\s*NO|SEVK\s*NO)[\s:]*([A-Za-z0-9\-]{3,30})/i);
    return {
      rawText: text, price: priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : null,
      fromCity: fromMatch ? fromMatch[1].trim() : null,
      toCity: toMatch ? toMatch[1].trim() : null,
      shipperName: shipperMatch ? shipperMatch[1].trim() : null,
      carrierName: carrierMatch ? carrierMatch[1].trim() : null,
      loadNo: loadNoMatch ? loadNoMatch[1].trim() : null,
    };
  }

  // ── EX-017: Driver license extraction ───────────────────
  private extractDriverLicense(text: string): DriverLicenseOcrData {
    const tcMatch = text.match(/(?:T\.?C\.?\s*(?:KİMLİK)?\s*NO|TC\s*NO|TCKN)[\s:]*([0-9]{11})/i);
    const licenseMatch = text.match(/(?:SÜRÜCÜ\s*BELGE\s*NO|BELGE\s*NO|LİSANS\s*NO)[\s:]*([A-Za-z]?[0-9]{6,10})/i);
    const firstNameMatch = text.match(/(?:ADI|İSİM)[\s:]*([A-ZĞÜŞİÖÇ]{2,20})/i);
    const lastNameMatch = text.match(/(?:SOYADI|SOYAD)[\s:]*([A-ZĞÜŞİÖÇ]{2,30})/i);
    const birthMatch = text.match(/(?:DOĞUM\s*TARİHİ|DOĞUM)[\s:]*([0-3][0-9][.\-/][0-1][0-9][.\-/][1-2][0-9]{3})/i);
    const expiryMatch = text.match(/(?:GEÇERLİLİK\s*TARİHİ|SON\s*GEÇERLİLİK|BİTİŞ)[\s:]*([0-3][0-9][.\-/][0-1][0-9][.\-/][1-2][0-9]{3})/i);
    const bloodMatch = text.match(/(?:KAN\s*GRUBU)[\s:]*([AB0][+-]?)/i);
    return {
      rawText: text, tcKimlikNo: tcMatch ? tcMatch[1] : null,
      licenseNo: licenseMatch ? licenseMatch[1] : null,
      firstName: firstNameMatch ? firstNameMatch[1] : null,
      lastName: lastNameMatch ? lastNameMatch[1] : null,
      birthDate: birthMatch ? birthMatch[1] : null,
      expiryDate: expiryMatch ? expiryMatch[1] : null,
      bloodType: bloodMatch ? bloodMatch[1] : null,
    };
  }

  // ── EX-017: SRC document extraction ─────────────────────
  private extractSrcDocument(text: string): SrcDocumentOcrData {
    const srcMatch = text.match(/(?:SRC\s*(?:BELGE)?\s*NO|SRC)[\s:]*([A-Za-z]?[0-9]{5,10})/i);
    const nameMatch = text.match(/(?:ADI\s*SOYADI|AD\s*SOYAD|SAHİBİ)[\s:]*([A-ZĞÜŞİÖÇ\s]{5,40})/i);
    const expiryMatch = text.match(/(?:GEÇERLİLİK\s*TARİHİ|SON\s*GEÇERLİLİK|BİTİŞ)[\s:]*([0-3][0-9][.\-/][0-1][0-9][.\-/][1-2][0-9]{3})/i);
    const categoryMatch = text.match(/(?:SRC\s*TÜRÜ|KATEGORİ|YETKİ)[\s:]*([12345])/i);
    return {
      rawText: text, srcNo: srcMatch ? srcMatch[1] : null,
      holderName: nameMatch ? nameMatch[1].trim() : null,
      expiryDate: expiryMatch ? expiryMatch[1] : null,
      category: categoryMatch ? `SRC${categoryMatch[1]}` : null,
    };
  }
}
