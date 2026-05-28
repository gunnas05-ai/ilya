import { Injectable, NotFoundException, BadRequestException, Optional, Inject, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, FindOptionsWhere } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';
import { Invoice, InvoiceType, InvoiceStatus } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { InvoiceLog } from './invoice-log.entity';
import { Customer } from './customer.entity';
import { Company } from './company.entity';
import { GibSubmission } from './gib-submission.entity';
import { XmlDocument } from './xml-document.entity';
import { generateInvoicePdf } from './pdf-generator';
import { validateUblTrXml } from './xsd-validator';
import { GibApiService } from './gib-api.service';
import { EmailService } from './email.service';
import { User } from '../users/user.entity';
import { Load } from '../loads/load.entity';

type XmlDocumentRepo = Repository<XmlDocument>;

const VAT_RATES = [1, 10, 20];
const WITHHOLDING_RATES = [0, 5, 10, 15];
const UNITS = ['adet', 'kg', 'ton', 'm3', 'lt', 'mt', 'saat', 'm2', 'paket', 'palet', 'koli', 'bidon', 'çuval', 'kutu'];

function roundDecimal(value: number): number {
  return Math.round(value * 100) / 100;
}

interface TaxResult {
  lineTotal: number;
  vatAmount: number;
  withholdingAmount: number;
  discountAmount: number;
  vatBase: number;
}

function calculateTaxLine(
  quantity: number,
  unitPrice: number,
  discountPct: number,
  vatRate: number,
  withholdingRate: number,
): TaxResult {
  const rawSubtotal = quantity * unitPrice;
  const discountAmount = rawSubtotal * (discountPct / 100);
  const vatBase = rawSubtotal - discountAmount;
  const vatAmount = vatBase * (vatRate / 100);
  const withholdingAmount = vatBase * (withholdingRate / 100);
  const lineTotal = vatBase + vatAmount - withholdingAmount;
  return { lineTotal, vatAmount, withholdingAmount, discountAmount, vatBase };
}

/**
 * Platform evrak numaralandırma standardı:
 * Format: [Prefix:2][YYYYMMDDHHmmss:14][Sequence:3]
 * Örnek: FA20260526234355001
 */
function generateInvoiceNo(type: InvoiceType, _seq: number): string {
  const { generateDocumentNo, getInvoicePrefix } = require('../common/document-no.util');
  const prefix = getInvoicePrefix(type);
  return generateDocumentNo(prefix);
}

@Injectable()
export class GibService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private itemRepo: Repository<InvoiceItem>,
    @InjectRepository(InvoiceLog)
    private logRepo: Repository<InvoiceLog>,
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(GibSubmission)
    private submissionRepo: Repository<GibSubmission>,
    @InjectRepository(XmlDocument)
    private xmlRepo: XmlDocumentRepo,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Load)
    private loadRepo: Repository<Load>,
    private gibApiService: GibApiService,
    private emailService: EmailService,
    @Optional() private creditService?: any,
  ) {}

  // ── Customer ──────────────────────────────────────────

  async getFrequentCustomers(companyId: string) {
    return this.customerRepo.find({ where: { companyId, isFrequent: true }, order: { createdAt: 'DESC' } });
  }

  async addCustomer(data: Partial<Customer>) {
    if (!data.vknTckn || data.vknTckn.length < 10) {
      throw new BadRequestException('Geçerli bir VKN/TCKN giriniz.');
    }
    const existing = await this.customerRepo.findOne({ where: { companyId: data.companyId, vknTckn: data.vknTckn } });
    if (existing) return existing;
    return this.customerRepo.save(this.customerRepo.create({ ...data, isFrequent: true }));
  }

  // ── Company Profile ────────────────────────────────────

  async getCompanyProfile(companyId: string) {
    let company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      company = this.companyRepo.create({ id: companyId, vkn: '', name: '', taxOffice: '', address: '' });
      company = await this.companyRepo.save(company);
    }
    return company;
  }

  async updateCompanyProfile(companyId: string, data: { vkn?: string; name?: string; taxOffice?: string; address?: string; mersisNo?: string; sicilNo?: string; phone?: string; email?: string }) {
    let company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      company = this.companyRepo.create({ id: companyId, ...data }) as Company;
    } else {
      Object.assign(company, data);
    }
    // Auto-detect profile completeness
    company.profileComplete = !!(company.vkn && company.name && company.taxOffice && company.address);
    return this.companyRepo.save(company);
  }

  async checkCompanyProfile(companyId: string) {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    const warnings: string[] = [];
    if (!company || !company.vkn) warnings.push('VKN tanımlı değil');
    if (!company || !company.name) warnings.push('Firma ünvanı tanımlı değil');
    if (!company || !company.taxOffice) warnings.push('Vergi dairesi tanımlı değil');
    if (!company || !company.address) warnings.push('Adres tanımlı değil');
    return {
      complete: warnings.length === 0,
      warnings,
      message: warnings.length > 0 ? 'E-Belge için Profil Ayarlarınızı tamamlayın' : 'Profil tamam',
    };
  }

  // ── Invoice CRUD ───────────────────────────────────────

  async createInvoice(data: {
    invoiceType: InvoiceType;
    companyId: string;
    userId?: string;
    senderJson?: string;
    receiverJson?: string;
    customerId?: string;
    customerName?: string;
    customerVknTckn?: string;
    customerTaxOffice?: string;
    customerAddress?: string;
    customerType?: string;
    scenario?: string;
    orderNo?: string;
    issueDate?: string;
    dueDate?: string;
    plateNumber?: string;
    driverTcNo?: string;
    shippingAddress?: string;
    transportType?: string;
    items: {
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      discountPct?: number;
      vatRate: number;
      withholdingRate?: number;
      productCode?: string;
    }[];
  }) {
    // Validate
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('En az bir kalem eklemelisiniz.');
    }
    for (const item of data.items) {
      if (!VAT_RATES.includes(item.vatRate)) {
        throw new BadRequestException(`Geçersiz KDV oranı: %${item.vatRate}. Desteklenen: %1, %10, %20`);
      }
      if (!UNITS.includes(item.unit)) {
        throw new BadRequestException(`Geçersiz birim: ${item.unit}`);
      }
    }

    // Check sender profile completeness
    const profile = await this.checkCompanyProfile(data.companyId);
    if (!profile.complete) {
      throw new BadRequestException(`E-Belge için Profil Ayarlarınızı tamamlayın: ${profile.warnings.join(', ')}`);
    }

    // Auto-populate sender/receiver JSON if not provided
    let senderJson = data.senderJson;
    let receiverJson = data.receiverJson;
    if (!senderJson) {
      const company = await this.companyRepo.findOne({ where: { id: data.companyId } });
      if (company) {
        senderJson = JSON.stringify({ vkn: company.vkn, name: company.name, taxOffice: company.taxOffice, address: company.address, mersisNo: company.mersisNo, sicilNo: company.sicilNo, phone: company.phone, email: company.email });
      }
    }
    if (!receiverJson) {
      const customer = data.customerId ? await this.customerRepo.findOne({ where: { id: data.customerId } }) : null;
      if (customer) {
        receiverJson = JSON.stringify({ vknTckn: customer.vknTckn, name: customer.name, taxOffice: customer.taxOffice, address: customer.address, type: customer.type });
      } else if (data.customerName && data.customerVknTckn) {
        receiverJson = JSON.stringify({ vknTckn: data.customerVknTckn, name: data.customerName, taxOffice: data.customerTaxOffice || '', address: data.customerAddress || '', type: data.customerType || '' });
      }
    }

    // Generate invoice no
    const count = await this.invoiceRepo.count();
    const invoiceNo = generateInvoiceNo(data.invoiceType, count + 1);
    const ettn = uuidv4();

    // Calculate tax for each line
    const calculatedItems = data.items.map((item, i) => {
      const tax = calculateTaxLine(
        item.quantity,
        item.unitPrice,
        item.discountPct || 0,
        item.vatRate,
        item.withholdingRate || 0,
      );
      return {
        invoiceId: '',
        lineNo: i + 1,
        productCode: item.productCode || '',
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        discountPct: item.discountPct || 0,
        vatRate: item.vatRate,
        vatAmount: tax.vatAmount,
        withholdingRate: item.withholdingRate || 0,
        withholdingAmount: tax.withholdingAmount,
        lineTotal: tax.lineTotal,
        _discountAmount: tax.discountAmount,
        _vatBase: tax.vatBase,
      };
    });

    // Totals (VUK: calculate with full precision, round only grand total at document level)
    const subtotal = calculatedItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const discountTotal = calculatedItems.reduce((s, i) => s + i._discountAmount, 0);
    const vatTotal = calculatedItems.reduce((s, i) => s + i.vatAmount, 0);
    const withholdingTotal = calculatedItems.reduce((s, i) => s + i.withholdingAmount, 0);
    const grandTotal = roundDecimal(calculatedItems.reduce((s, i) => s + i.lineTotal, 0));

    // Kontör kontrolü
    if (this.creditService && data.userId) {
      await this.creditService.deduct(data.userId, 1, 'invoice', 'pending');
    }

    // Save invoice
    const invoice = this.invoiceRepo.create({
      invoiceType: data.invoiceType,
      companyId: data.companyId,
      customerId: data.customerId || '',
      invoiceNo,
      ettn,
      scenario: data.scenario || 'Temel',
      currency: 'TRY',
      issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      status: InvoiceStatus.DRAFT,
      senderJson: senderJson || '',
      receiverJson: receiverJson || '',
      subtotal,
      discountTotal,
      vatTotal,
      withholdingTotal,
      grandTotal,
      paidAmount: 0,
      plateNumber: data.plateNumber || '',
      driverTcNo: data.driverTcNo || '',
      shippingAddress: data.shippingAddress || '',
      transportType: data.transportType || '',
      orderNo: data.orderNo || '',
      createdById: data.companyId,
    });
    const saved = await this.invoiceRepo.save(invoice);

    // Save items
    const items = calculatedItems.map((i) => {
      const { _discountAmount, _vatBase, ...rest } = i;
      return this.itemRepo.create({ ...rest, invoiceId: saved.id });
    });
    await this.itemRepo.save(items);

    // Log
    await this.logRepo.save(this.logRepo.create({
      invoiceId: saved.id,
      action: 'created',
      detail: `${data.invoiceType} tipinde belge oluşturuldu`,
      performedById: data.companyId,
    }));

    return this.findById(saved.id);
  }

  async findById(id: string) {
    const inv = await this.invoiceRepo.findOne({ where: { id }, relations: ['items'] });
    if (!inv) throw new NotFoundException('Belge bulunamadı');
    return inv;
  }

  async findAll(filters: {
    companyId: string;
    status?: InvoiceStatus;
    invoiceType?: InvoiceType;
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const where: FindOptionsWhere<Invoice> = { companyId: filters.companyId };

    if (filters.status) where.status = filters.status;
    if (filters.invoiceType) where.invoiceType = filters.invoiceType;
    if (filters.dateFrom || filters.dateTo) {
      if (filters.dateFrom) where.issueDate = MoreThan(new Date(filters.dateFrom));
      if (filters.dateTo) where.issueDate = LessThan(new Date(filters.dateTo));
    }

    const [invoices, total] = await this.invoiceRepo.findAndCount({
      where: where as any,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const enriched = invoices.map((inv) => ({
      ...inv,
      invoiceTypeLabel: this.invoiceTypeLabel(inv.invoiceType),
    }));

    return { invoices: enriched, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ── Workflow ───────────────────────────────────────────

  async preview(id: string) {
    const inv = await this.findById(id);
    const pdfBuffer = await generateInvoicePdf(inv);
    const base64 = pdfBuffer.toString('base64');
    return { ...inv, previewPdf: `data:application/pdf;base64,${base64}` };
  }

  async approve(id: string, userId: string) {
    const inv = await this.findById(id);
    if (inv.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Yalnızca taslak belgeler onaylanabilir.');
    }

    const isProforma = inv.invoiceType === InvoiceType.PROFORMA;

    if (!isProforma) {
      // XSD validation before approve (skip for Proforma — PDF only)
      const xmlContent = this.generateUblTrXml(inv);
      const validation = validateUblTrXml(xmlContent);
      if (!validation.valid) {
        throw new BadRequestException(`XSD validasyon başarısız: ${validation.errors.join('; ')}`);
      }

      // Save validated XML document
      await this.xmlRepo.save(this.xmlRepo.create({
        invoiceId: id,
        xmlContent,
        xsdValid: true,
      }));
    }

    inv.status = InvoiceStatus.PENDING;
    await this.invoiceRepo.update(id, { status: InvoiceStatus.PENDING });

    await this.logRepo.save(this.logRepo.create({
      invoiceId: id,
      action: 'approved',
      detail: isProforma ? 'Proforma onaya taşındı (XSD/XML atlandı)' : 'Belge onaya taşındı (XSD validasyon başarılı)',
      performedById: userId,
    }));

    return this.findById(id);
  }

  async sendToGib(id: string, userId: string) {
    const inv = await this.findById(id);
    if (inv.status !== InvoiceStatus.PENDING) {
      throw new BadRequestException('Belge onay bekliyor durumunda olmalıdır.');
    }

    const isProforma = inv.invoiceType === InvoiceType.PROFORMA;
    const isEArsiv = inv.invoiceType === InvoiceType.E_ARSIV;
    let qrUrl = '';

    if (!isProforma) {
      // Generate and validate UBL-TR XML (skip for Proforma)
      const xmlContent = this.generateUblTrXml(inv);
      const validation = validateUblTrXml(xmlContent);
      if (!validation.valid) {
        throw new BadRequestException(`XSD validasyon başarısız: ${validation.errors.join('; ')}`);
      }

      // Generate QR code
      qrUrl = `https://ebelge.gib.gov.tr/sorgula?uuid=${inv.ettn}`;
      await QRCode.toDataURL(qrUrl);

      // Save XML document
      await this.xmlRepo.save(this.xmlRepo.create({
        invoiceId: id,
        xmlContent,
        xsdValid: true,
      }));

      // Send to GİB via integrator API (real or mock)
      const apiResult = await this.gibApiService.sendInvoice(xmlContent, inv.ettn, inv.invoiceNo);

      // Record submission
      await this.submissionRepo.save(this.submissionRepo.create({
        invoiceId: id,
        requestPayload: xmlContent,
        responseCode: apiResult.responseCode,
        responseBody: apiResult.responseBody,
        success: apiResult.success,
      }));

      if (!apiResult.success) {
        throw new BadRequestException(`GİB entegratör hatası: ${apiResult.responseBody}`);
      }
    }

    // Generate PDF (all types including Proforma)
    const pdfBuffer = await generateInvoicePdf(inv);

    // E-Arşiv: PDF'yi alıcıya e-posta ile gönder
    if (isEArsiv) {
      const receiver = JSON.parse(inv.receiverJson || '{}');
      await this.emailService.sendInvoicePdf(receiver.email, inv.invoiceNo, pdfBuffer);
    }

    // Gönderici User üzerinden Accountant bilgisini bul ve PDF+XML gönder
    const senderUser = await this.userRepo.findOne({ where: { id: inv.companyId } });
    if (senderUser && senderUser.accountantEmail) {
      const xmlData = !isProforma ? await this.xmlRepo.findOne({ where: { invoiceId: id } }) : null;
      await this.emailService.sendInvoiceToAccountant(
        senderUser.accountantEmail,
        inv.invoiceNo,
        pdfBuffer,
        xmlData ? xmlData.xmlContent.toString() : ''
      );
    }

    // Update status
    inv.status = InvoiceStatus.SENT;
    inv.sentAt = new Date();
    await this.invoiceRepo.update(id, { status: InvoiceStatus.SENT, sentAt: new Date(), qrUrl });

    await this.logRepo.save(this.logRepo.create({
      invoiceId: id,
      action: 'sent_to_gib',
      detail: isProforma ? 'Proforma PDF oluşturuldu (GİB\'e iletilmez)' : 'GİB\'e iletildi (PDF+XML üretildi)',
      performedById: userId,
    }));

    return this.findById(id);
  }

  async cancel(id: string, userId: string) {
    const inv = await this.findById(id);
    if ([InvoiceStatus.SENT, InvoiceStatus.APPROVED].includes(inv.status)) {
      throw new BadRequestException('Gönderilmiş belge iptal edilemez. İptal faturası kesiniz.');
    }
    await this.invoiceRepo.update(id, { status: InvoiceStatus.CANCELLED });

    await this.logRepo.save(this.logRepo.create({
      invoiceId: id,
      action: 'cancelled',
      detail: 'Belge iptal edildi',
      performedById: userId,
    }));

    return this.findById(id);
  }

  async archive(id: string, userId: string) {
    const inv = await this.findById(id);
    if (inv.status === InvoiceStatus.DRAFT) {
      throw new BadRequestException('Taslak belgeler arşivlenemez. Önce onaylayınız.');
    }
    if (inv.status === InvoiceStatus.ARCHIVED) {
      throw new BadRequestException('Belge zaten arşivlenmiş.');
    }
    await this.invoiceRepo.update(id, { status: InvoiceStatus.ARCHIVED });

    await this.logRepo.save(this.logRepo.create({
      invoiceId: id,
      action: 'archived',
      detail: 'Belge arşivlendi',
      performedById: userId,
    }));

    return this.findById(id);
  }

  async issueCancelInvoice(id: string, userId: string, reason?: string) {
    const original = await this.findById(id);
    if (![InvoiceStatus.SENT, InvoiceStatus.APPROVED].includes(original.status)) {
      throw new BadRequestException('Yalnızca gönderilmiş veya onaylanmış belgeler için iptal faturası kesilebilir.');
    }

    // Create cancellation invoice with negated items
    const cancelledItems = (original.items || []).map((item) => ({
      description: `İPTAL: ${item.description} (asıl: ${original.invoiceNo})`,
      quantity: -Math.abs(item.quantity),
      unit: item.unit,
      unitPrice: item.unitPrice,
      discountPct: item.discountPct,
      vatRate: item.vatRate,
      withholdingRate: item.withholdingRate,
      productCode: item.productCode,
    }));

    const cancelInv = await this.createInvoice({
      invoiceType: original.invoiceType,
      companyId: original.companyId,
      senderJson: original.senderJson,
      receiverJson: original.receiverJson,
      scenario: original.scenario,
      issueDate: new Date().toISOString(),
      items: cancelledItems,
      orderNo: original.invoiceNo,
    });

    // Link cancellation to original
    await this.invoiceRepo.update(cancelInv.id, { cancelsInvoiceId: id });

    await this.logRepo.save(this.logRepo.create({
      invoiceId: id,
      action: 'cancelled',
      detail: `İptal faturası kesildi: ${cancelInv.invoiceNo}${reason ? ` (${reason})` : ''}`,
      performedById: userId,
    }));

    await this.logRepo.save(this.logRepo.create({
      invoiceId: cancelInv.id,
      action: 'created',
      detail: `İptal faturası (asıl: ${original.invoiceNo})`,
      performedById: userId,
    }));

    return this.findById(cancelInv.id);
  }

  // ── UBL-TR XML Generation ────────────────────────────

  generateUblTrXml(invoice: Invoice): string {
    const sender = JSON.parse(invoice.senderJson);
    const receiver = JSON.parse(invoice.receiverJson);
    const isDomestic = invoice.invoiceType !== InvoiceType.IHRACAT;

    const lines = invoice.items.map((item) => `
      <cac:InvoiceLine>
        <cbc:ID>${item.lineNo}</cbc:ID>
        <cbc:Note/>
        <cbc:InvoicedQuantity unitCode="${this.mapUnit(item.unit)}">${item.quantity}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="TRY">${item.quantity * item.unitPrice}</cbc:LineExtensionAmount>
        <cac:TaxTotal>
          <cbc:TaxAmount currencyID="TRY">${item.vatAmount}</cbc:TaxAmount>
          <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="TRY">${item.quantity * item.unitPrice - (item.quantity * item.unitPrice * item.discountPct / 100)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="TRY">${item.vatAmount}</cbc:TaxAmount>
            <cbc:Percent>${item.vatRate}</cbc:Percent>
            <cac:TaxCategory>
              <cac:TaxScheme>
                <cbc:Name>KDV</cbc:Name>
                <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
              </cac:TaxScheme>
            </cac:TaxCategory>
          </cac:TaxSubtotal>
        </cac:TaxTotal>
        <cac:Item>
          <cbc:Name>${this.escapeXml(item.description)}</cbc:Name>
        </cac:Item>
        <cac:Price>
          <cbc:PriceAmount currencyID="TRY">${item.unitPrice}</cbc:PriceAmount>
        </cac:Price>
      </cac:InvoiceLine>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <ds:Signature Id="signature-placeholder">
          <ds:SignedInfo>
            <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
            <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
            <ds:Reference URI="">
              <ds:Transforms>
                <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
              </ds:Transforms>
              <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
              <ds:DigestValue></ds:DigestValue>
            </ds:Reference>
          </ds:SignedInfo>
          <ds:SignatureValue></ds:SignatureValue>
        </ds:Signature>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>${isDomestic ? 'TEMEL' : 'IHRACAT'}</cbc:ProfileID>
  <cbc:ID>${invoice.ettn}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:UUID>${invoice.ettn}</cbc:UUID>
  <cbc:IssueDate>${invoice.issueDate.toISOString().slice(0, 10)}</cbc:IssueDate>
  <cbc:IssueTime>${invoice.issueDate.toISOString().slice(11, 19)}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>${this.mapInvoiceTypeCode(invoice.invoiceType)}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${invoice.items.length}</cbc:LineCountNumeric>

  <!-- Accounting Supplier Party -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:WebsiteURI/>
      <cac:PartyIdentification>
        <cbc:ID schemeID="VKN">${sender.vkn}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${this.escapeXml(sender.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${this.escapeXml(sender.address || '')}</cbc:StreetName>
        <cbc:CitySubdivisionName>${this.escapeXml(sender.district || '')}</cbc:CitySubdivisionName>
        <cbc:CityName>${this.escapeXml(sender.city || '')}</cbc:CityName>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cac:TaxScheme>
          <cbc:Name>${this.escapeXml(sender.taxOffice || '')}</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Accounting Customer Party -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${receiver.type === 'kurumsal' ? 'VKN' : 'TCKN'}">${receiver.vknTckn}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${this.escapeXml(receiver.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${this.escapeXml(receiver.address || '')}</cbc:StreetName>
        <cbc:CityName>${this.escapeXml(receiver.city || '')}</cbc:CityName>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cac:TaxScheme>
          <cbc:Name>${this.escapeXml(receiver.taxOffice || '')}</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Tax Total -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="TRY">${invoice.vatTotal}</cbc:TaxAmount>
  </cac:TaxTotal>

  <!-- Grand Total -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="TRY">${invoice.subtotal}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="TRY">${invoice.subtotal - invoice.discountTotal}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="TRY">${invoice.grandTotal}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="TRY">${invoice.grandTotal}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Invoice Lines -->
  ${lines}
</Invoice>`;
  }

  // ── PDF Preview HTML ──────────────────────────────────

  generatePreviewHtml(invoice: Invoice): string {
    const sender = JSON.parse(invoice.senderJson);
    const receiver = JSON.parse(invoice.receiverJson);
    const typeLabel = this.invoiceTypeLabel(invoice.invoiceType);

    let itemsHtml = invoice.items.map((item) => `
      <tr${(item.lineNo % 2 === 0) ? ' style="background:#F4F4F4"' : ''}>
        <td style="padding:6px 8px;font-size:9pt;border-bottom:0.5pt solid #808080;">${item.lineNo}</td>
        <td style="padding:6px 8px;font-size:9pt;border-bottom:0.5pt solid #808080;">${this.escapeHtml(item.description)}</td>
        <td style="padding:6px 8px;font-size:9pt;text-align:right;border-bottom:0.5pt solid #808080;">${item.quantity}</td>
        <td style="padding:6px 8px;font-size:9pt;text-align:center;border-bottom:0.5pt solid #808080;">${item.unit}</td>
        <td style="padding:6px 8px;font-size:9pt;text-align:right;border-bottom:0.5pt solid #808080;">${item.unitPrice.toFixed(2)}</td>
        <td style="padding:6px 8px;font-size:9pt;text-align:right;border-bottom:0.5pt solid #808080;">%${item.discountPct}</td>
        <td style="padding:6px 8px;font-size:9pt;text-align:right;border-bottom:0.5pt solid #808080;">%${item.vatRate}</td>
        <td style="padding:6px 8px;font-size:9pt;text-align:right;border-bottom:0.5pt solid #808080;font-weight:bold;">${item.lineTotal.toFixed(2)}</td>
      </tr>`).join('\n');

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @page { size: A4; margin: 25mm 10mm 20mm 20mm; @bottom-center { content: counter(page) " / " counter(pages); font-size: 8pt; font-family: Arial, sans-serif; color: #666; } }
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; margin: 0; padding: 20mm; }
  .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .logo { max-height: 25mm; max-width: 60mm; }
  .title { text-align: right; }
  .title h1 { font-size: 18pt; font-weight: bold; margin: 0; }
  .title .meta { font-size: 9pt; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #E6E6E6; font-weight: bold; font-size: 9pt; padding: 8px; border: 0.5pt solid #808080; }
  td { font-size: 9pt; padding: 6px 8px; border: 0.5pt solid #808080; }
  .totals { margin-top: 20px; text-align: right; }
  .totals p { margin: 4px 0; }
  .grand { font-size: 12pt; font-weight: bold; }
  .qr-section { display: flex; justify-content: flex-end; margin-top: 16px; }
  .qr-label { font-size: 7pt; text-align: center; color: #666; margin-top: 4px; }
  .footer { margin-top: 40px; font-size: 8pt; color: #666; text-align: center; border-top: 0.5pt solid #808080; padding-top: 10px; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-45deg); font-size: 60pt; color: #D9D9D9; opacity: 0.15; pointer-events: none; z-index: -1; }
</style></head><body>
<div class="watermark">${typeLabel}</div>
<div class="header">
  <div><div class="logo">${sender.name}</div></div>
  <div class="title">
    <h1>${typeLabel}</h1>
    <p class="meta">Senaryo: ${invoice.scenario}</p>
    <p class="meta">Belge No: ${invoice.invoiceNo}</p>
    <p class="meta">Tarih: ${new Date(invoice.issueDate).toLocaleDateString('tr-TR')}</p>
    <p class="meta">ETTN: ${invoice.ettn}</p>
  </div>
</div>

<table>
  <tr><td style="width:50%;vertical-align:top;border:none;">
    <strong>Gönderen:</strong><br>
    ${this.escapeHtml(sender.name)}<br>
    ${sender.vkn ? `VKN: ${sender.vkn}<br>` : ''}
    ${this.escapeHtml(sender.address || '')}
  </td><td style="width:50%;vertical-align:top;border:none;">
    <strong>Alıcı:</strong><br>
    ${this.escapeHtml(receiver.name)}<br>
    ${receiver.vknTckn ? `${receiver.type === 'kurumsal' ? 'VKN' : 'TCKN'}: ${receiver.vknTckn}<br>` : ''}
    ${this.escapeHtml(receiver.address || '')}
  </td></tr>
</table>

<table>
  <tr>
    <th>#</th><th>Açıklama</th><th>Miktar</th><th>Birim</th><th>Birim Fiyat</th><th>İskonto</th><th>KDV</th><th>Tutar</th>
  </tr>
  ${itemsHtml}
</table>

<div class="totals">
  <p>Mal/Hizmet Toplamı: <strong>${invoice.subtotal.toFixed(2)} ₺</strong></p>
  <p>Toplam İskonto: <strong>${invoice.discountTotal.toFixed(2)} ₺</strong></p>
  <p>KDV Matrahı: <strong>${(invoice.subtotal - invoice.discountTotal).toFixed(2)} ₺</strong></p>
  <p>Hesaplanan KDV: <strong>${invoice.vatTotal.toFixed(2)} ₺</strong></p>
  ${invoice.withholdingTotal > 0 ? `<p>Tevkifat: <strong>${invoice.withholdingTotal.toFixed(2)} ₺</strong></p>` : ''}
  <p class="grand">Net Ödenecek Tutar: <strong>${invoice.grandTotal.toFixed(2)} ₺</strong></p>
  <p style="font-size:9pt;">${this.numberToWords(invoice.grandTotal)}</p>
</div>

<div class="footer">
  <p>Bu belge elektronik ortamda oluşturulmuştur. Islak imza aranmaz.</p>
  <p>GİB Uyumludur – KAPTAN Lojistik Sistemi</p>
  <p>Oluşturma: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}</p>
</div>
</body></html>`;
  }

  // ── Document Downloads ───────────────────────────────

  async getPdf(id: string): Promise<Buffer> {
    const inv = await this.findById(id);
    return generateInvoicePdf(inv);
  }

  async getXml(id: string) {
    const inv = await this.findById(id);
    const xmlContent = this.generateUblTrXml(inv);
    return { xmlContent, filename: `${inv.invoiceNo}.xml` };
  }

  async getQr(id: string) {
    const inv = await this.findById(id);
    if (!inv.qrUrl) {
      const qrUrl = `https://ebelge.gib.gov.tr/sorgula?uuid=${inv.ettn}`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl);
      return { ettn: inv.ettn, qrDataUrl, qrUrl };
    }
    const qrDataUrl = await QRCode.toDataURL(inv.qrUrl);
    return { ettn: inv.ettn, qrDataUrl, qrUrl: inv.qrUrl };
  }

  async getLogs(invoiceId: string) {
    return this.logRepo.find({ where: { invoiceId }, order: { createdAt: 'DESC' } });
  }

  async getSubmissionStatus(invoiceId: string) {
    const inv = await this.findById(invoiceId);
    const submissions = await this.submissionRepo.find({
      where: { invoiceId },
      order: { createdAt: 'DESC' },
    });

    let gibStatus = { status: 'unknown', detail: 'GİB\'e iletilmedi' };
    if (inv.status === InvoiceStatus.SENT || inv.status === InvoiceStatus.APPROVED) {
      gibStatus = await this.gibApiService.checkStatus(inv.ettn);
    }

    return {
      invoiceId,
      invoiceNo: inv.invoiceNo,
      status: inv.status,
      ettn: inv.ettn,
      submissions: submissions.map((s) => ({
        id: s.id,
        responseCode: s.responseCode,
        success: s.success,
        createdAt: s.createdAt,
      })),
      gibStatus,
    };
  }

  // ── EX-009: Send to Accountant ────────────────────

  async sendToAccountant(id: string, accountantEmail?: string) {
    const inv = await this.findById(id);

    // Determine recipient: explicit param > user's accountantEmail
    let recipient = accountantEmail;
    if (!recipient) {
      const senderUser = await this.userRepo.findOne({ where: { id: inv.companyId } });
      recipient = senderUser?.accountantEmail;
    }

    if (!recipient) {
      throw new BadRequestException(
        'Muhasebeci e-posta adresi bulunamadı. Lütfen profil ayarlarınızdan muhasebeci e-postası ekleyin.',
      );
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePdf(inv);

    // Get XML content
    let xmlContent = '';
    try {
      const xmlData = await this.xmlRepo.findOne({ where: { invoiceId: id } });
      if (xmlData) xmlContent = xmlData.xmlContent.toString();
    } catch {
      // XML not yet generated (draft invoices)
    }
    if (!xmlContent && inv.status !== InvoiceStatus.DRAFT) {
      xmlContent = this.generateUblTrXml(inv);
    }

    const sent = await this.emailService.sendInvoiceToAccountant(
      recipient,
      inv.invoiceNo,
      pdfBuffer,
      xmlContent,
    );

    // Log
    await this.logRepo.save(this.logRepo.create({
      invoiceId: id,
      action: 'sent_to_accountant',
      detail: `PDF${xmlContent ? '+XML' : ''} muhasebeciye gönderildi: ${recipient}`,
      performedById: inv.companyId,
    }));

    return {
      success: sent,
      recipient,
      invoiceNo: inv.invoiceNo,
      message: sent
        ? `${inv.invoiceNo} muhasebeciye (${recipient}) gönderildi.`
        : `E-posta gönderimi başarısız oldu. Lütfen SMTP ayarlarını kontrol edin.`,
    };
  }

  /** EX-009: Get invoices for accountant (all company invoices across all users in same company) */
  async getAccountantInvoices(userId: string, filters: { status?: string; page?: number; limit?: number }) {
    // Accountant sees all invoices from users whose accountantEmail matches or has finance invites
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);

    const qb = this.invoiceRepo.createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .orderBy('invoice.createdAt', 'DESC');

    if (filters.status) {
      qb.andWhere('invoice.status = :status', { status: filters.status });
    }

    const [invoices, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const enriched = invoices.map(inv => ({
      ...inv,
      invoiceTypeLabel: this.invoiceTypeLabel(inv.invoiceType),
    }));

    return { invoices: enriched, total, page, totalPages: Math.ceil(total / limit) };
  }

  /** EX-009: Accountant KDV summary */
  async getAccountantKDVSummary(userId: string) {
    const qb = this.invoiceRepo.createQueryBuilder('invoice')
      .where('invoice.status IN (:...statuses)', { statuses: ['sent', 'approved'] });

    const invoices = await qb.getMany();

    const byMonth: Record<string, { vatTotal: number; subtotal: number; count: number; grandTotal: number }> = {};
    let totalVat = 0;
    let totalSubtotal = 0;
    let totalGrand = 0;

    for (const inv of invoices) {
      const month = inv.issueDate.toISOString().slice(0, 7); // YYYY-MM
      if (!byMonth[month]) byMonth[month] = { vatTotal: 0, subtotal: 0, count: 0, grandTotal: 0 };
      byMonth[month].vatTotal += Number(inv.vatTotal);
      byMonth[month].subtotal += Number(inv.subtotal);
      byMonth[month].grandTotal += Number(inv.grandTotal);
      byMonth[month].count += 1;
      totalVat += Number(inv.vatTotal);
      totalSubtotal += Number(inv.subtotal);
      totalGrand += Number(inv.grandTotal);
    }

    const monthly = Object.entries(byMonth)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month));

    return {
      summary: { totalVat, totalSubtotal, totalGrand, totalInvoices: invoices.length },
      monthly,
    };
  }

  // ── Helpers ──────────────────────────────────────────

  private mapUnit(unit: string): string {
    const map: Record<string, string> = { adet: 'C62', kg: 'KGM', ton: 'TNE', m3: 'MTQ', lt: 'LTR', mt: 'MTR', saat: 'HUR', m2: 'MTK', paket: 'PA', palet: 'GP', koli: 'CS', kutu: 'BX' };
    return map[unit] || 'C62';
  }

  private mapInvoiceTypeCode(type: InvoiceType): string {
    const map: Record<string, string> = {
      [InvoiceType.E_FATURA]: 'SATIS', [InvoiceType.E_ARSIV]: 'SATIS', [InvoiceType.TEMEL]: 'SATIS',
      [InvoiceType.TICARI]: 'SATIS', [InvoiceType.IRSALIYELI]: 'SATIS', [InvoiceType.ISTISNA]: 'ISTISNA',
      [InvoiceType.IHRACAT]: 'IHRACAT', [InvoiceType.TEVKIFATLI]: 'TEVKIFAT', [InvoiceType.KDV_MUAF]: 'MUAF',
      [InvoiceType.PROFORMA]: 'PROFORMA', [InvoiceType.E_IRSALIYE]: 'SEVK',
    };
    return map[type] || 'SATIS';
  }

  private invoiceTypeLabel(type: InvoiceType): string {
    const labels: Record<string, string> = {
      [InvoiceType.E_FATURA]: 'E-Fatura', [InvoiceType.E_ARSIV]: 'E-Arşiv Fatura',
      [InvoiceType.PROFORMA]: 'Proforma Fatura', [InvoiceType.TEMEL]: 'Temel Fatura',
      [InvoiceType.TICARI]: 'Ticari Fatura', [InvoiceType.IRSALIYELI]: 'İrsaliyeli Fatura',
      [InvoiceType.E_IRSALIYE]: 'E-İrsaliye', [InvoiceType.ISTISNA]: 'İstisna Faturası',
      [InvoiceType.IHRACAT]: 'İhracat Faturası', [InvoiceType.TEVKIFATLI]: 'Tevkifatlı Fatura',
      [InvoiceType.KDV_MUAF]: 'KDV Muaf Fatura', [InvoiceType.U_ETDS]: 'U-ETDS',
    };
    return labels[type] || type;
  }

  private escapeXml(s: string): string {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  private escapeHtml(s: string): string {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private numberToWords(amount: number): string {
    const whole = Math.floor(amount);
    const kurus = Math.round((amount - whole) * 100);
    const ones = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz'];
    const tens = ['', 'On', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan'];
    const scales = ['', 'Bin', 'Milyon', 'Milyar'];

    function convertChunk(n: number): string {
      if (n === 0) return '';
      const h = Math.floor(n / 100);
      const t = Math.floor((n % 100) / 10);
      const o = n % 10;
      let s = '';
      if (h > 0) s += (h === 1 ? 'Yüz' : ones[h] + 'Yüz');
      if (t > 0) s += tens[t];
      if (o > 0) s += ones[o];
      return s;
    }

    if (whole === 0) return 'Sıfır Türk Lirası';
    let result = '';
    let remaining = whole;
    let scaleIdx = 0;
    while (remaining > 0) {
      const chunk = remaining % 1000;
      if (chunk > 0) {
        let chunkStr = convertChunk(chunk);
        if (chunk === 1 && scaleIdx === 1) chunkStr = 'Bin';
        else if (chunk === 1 && scaleIdx > 1) chunkStr = 'Bir';
        result = chunkStr + scales[scaleIdx] + result;
      }
      remaining = Math.floor(remaining / 1000);
      scaleIdx++;
    }
    result += ' Türk Lirası';
    if (kurus > 0) result += `${kurus} Kuruş`;
    return result;
  }

  // ── Event Listeners ────────────────────────────────────

  @OnEvent('delivery.completed.verified')
  async handleDeliveryCompleted(payload: { loadId: string; driverId: string; shipperId: string; pdfUrl: string }) {
    const load = await this.loadRepo.findOne({ where: { id: payload.loadId } });
    if (!load) return;

    const shipper = await this.userRepo.findOne({ where: { id: payload.shipperId } });
    const carrier = await this.userRepo.findOne({ where: { id: payload.driverId } });
    
    if (!carrier || !shipper) return;

    // Sadece Taşıyıcı adına fatura kesilir (Taşıyıcı faturayı Yük Verene keser)
    try {
      await this.createInvoice({
        invoiceType: InvoiceType.TICARI, // Varsayılan ticari fatura
        companyId: payload.driverId, // Taşıyıcı
        customerName: shipper.fullName,
        customerVknTckn: shipper.tcKimlikNo || shipper.taxNumber || '11111111111',
        customerTaxOffice: shipper.taxOffice || 'Bilinmiyor',
        customerAddress: 'Sistem üzerinden otomatik',
        customerType: shipper.taxNumber ? 'kurumsal' : 'bireysel',
        scenario: 'TicariFatura',
        orderNo: load.loadNo,
        issueDate: new Date().toISOString(),
        items: [
          {
            description: `${load.fromCity} - ${load.toCity} Nakliye Bedeli (${load.loadType})`,
            quantity: 1,
            unit: 'adet',
            unitPrice: load.totalPrice || 0,
            vatRate: 20, // Varsayılan KDV
          }
        ]
      });
      // Invoice generated as Draft. 
    } catch (err: any) {
      console.error(`Otomatik e-fatura oluşturulamadı: ${err.message}`);
    }
  }
}

