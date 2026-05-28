export interface XsdValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates UBL-TR 1.2 XML structure against required elements.
 * Checks namespace declarations, required fields, and structural integrity.
 */
export function validateUblTrXml(xmlContent: string): XsdValidationResult {
  const errors: string[] = [];

  if (!xmlContent || xmlContent.trim().length === 0) {
    return { valid: false, errors: ['XML içeriği boş'] };
  }

  // 1. Check XML declaration
  if (!/^<\?xml\s+version/i.test(xmlContent.trim())) {
    errors.push('XML bildirimi (<?xml ...>) eksik');
  }

  // 2. Check top-level element is Invoice with correct namespace
  const nsMatch = xmlContent.match(/xmlns\s*=\s*"([^"]+)"/);
  if (!nsMatch) {
    errors.push('Ana namespace eksik');
  } else if (nsMatch[1] !== 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2') {
    errors.push('Geçersiz ana namespace. UBL-TR Invoice namespace bekleniyor');
  }

  // 3. Check required namespace declarations
  const requiredNamespaces: [string, string][] = [
    ['xmlns:cac', 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'],
    ['xmlns:cbc', 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'],
    ['xmlns:ext', 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2'],
    ['xmlns:ds', 'http://www.w3.org/2000/09/xmldsig#'],
  ];

  for (const [ns, uri] of requiredNamespaces) {
    const regex = new RegExp(`${escapeRegex(ns)}\\s*=\\s*"${escapeRegex(uri)}"`);
    if (!regex.test(xmlContent)) {
      errors.push(`Namespace eksik veya hatalı: ${ns}="${uri}"`);
    }
  }

  // 4. Check required elements with content
  const requiredElements: [string, string][] = [
    ['cbc:UBLVersionID', 'UBL Versiyon ID'],
    ['cbc:CustomizationID', 'Özelleştirme ID (TR1.2)'],
    ['cbc:ProfileID', 'Profil ID'],
    ['cbc:ID', 'Belge ID (ETTN)'],
    ['cbc:IssueDate', 'Düzenleme Tarihi'],
    ['cbc:IssueTime', 'Düzenleme Saati'],
    ['cbc:InvoiceTypeCode', 'Belge Tip Kodu'],
    ['cbc:DocumentCurrencyCode', 'Para Birimi'],
    ['cbc:LineCountNumeric', 'Satır Sayısı'],
  ];

  for (const [element, label] of requiredElements) {
    const content = extractElementContent(xmlContent, element);
    if (content === null) {
      errors.push(`Zorunlu alan eksik: ${element} (${label})`);
    } else if (content.trim() === '') {
      errors.push(`Zorunlu alan boş: ${element} (${label})`);
    }
  }

  // 5. Check UUID validity (ETTN)
  const ettn = extractElementContent(xmlContent, 'cbc:ID');
  if (ettn) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(ettn.trim())) {
      errors.push('ETTN (cbc:ID) geçerli bir UUID formatında değil');
    }
  }

  // 6. Check sender (AccountingSupplierParty)
  if (!hasElement(xmlContent, 'cac:AccountingSupplierParty')) {
    errors.push('Gönderen bilgisi eksik (cac:AccountingSupplierParty)');
  } else {
    if (!hasElement(xmlContent, 'cac:PartyIdentification')) {
      errors.push('Gönderen VKN/TCKN bilgisi eksik');
    }
  }

  // 7. Check receiver (AccountingCustomerParty)
  if (!hasElement(xmlContent, 'cac:AccountingCustomerParty')) {
    errors.push('Alıcı bilgisi eksik (cac:AccountingCustomerParty)');
  } else {
    if (!hasElement(xmlContent, 'cac:PartyIdentification')) {
      errors.push('Alıcı VKN/TCKN bilgisi eksik');
    }
  }

  // 8. Check TaxTotal
  if (!hasElement(xmlContent, 'cac:TaxTotal')) {
    errors.push('Vergi toplamı eksik (cac:TaxTotal)');
  }

  // 9. Check LegalMonetaryTotal
  if (!hasElement(xmlContent, 'cac:LegalMonetaryTotal')) {
    errors.push('Mali toplamlar eksik (cac:LegalMonetaryTotal)');
  } else {
    const payable = extractElementContent(xmlContent, 'cbc:PayableAmount');
    if (payable === null || payable.trim() === '') {
      errors.push('Ödenecek tutar eksik (cbc:PayableAmount)');
    }
  }

  // 10. Check at least one InvoiceLine
  const lineCount = countElements(xmlContent, 'cac:InvoiceLine');
  if (lineCount === 0) {
    errors.push('En az bir fatura kalemi (cac:InvoiceLine) olmalıdır');
  }

  // 11. Check UBL version
  const ublVersion = extractElementContent(xmlContent, 'cbc:UBLVersionID');
  if (ublVersion && ublVersion.trim() !== '2.1') {
    errors.push(`UBL versiyonu 2.1 olmalıdır, mevcut: ${ublVersion.trim()}`);
  }

  // 12. Check customization ID
  const customizationId = extractElementContent(xmlContent, 'cbc:CustomizationID');
  if (customizationId && customizationId.trim() !== 'TR1.2') {
    errors.push(`CustomizationID TR1.2 olmalıdır, mevcut: ${customizationId.trim()}`);
  }

  return { valid: errors.length === 0, errors };
}

// ── XML extraction helpers ─────────────────────────────

function extractElementContent(xml: string, elementName: string): string | null {
  // Handles both self-closing and regular elements
  const selfClosing = new RegExp(`<${escapeRegex(elementName)}\\s*/>`);
  if (selfClosing.test(xml)) return '';

  const regex = new RegExp(`<${escapeRegex(elementName)}[^>]*>([\\s\\S]*?)</${escapeRegex(elementName)}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function hasElement(xml: string, elementName: string): boolean {
  const regex = new RegExp(`<${escapeRegex(elementName)}[^>]*>`);
  return regex.test(xml);
}

function countElements(xml: string, elementName: string): number {
  const regex = new RegExp(`<${escapeRegex(elementName)}[^>]*>`, 'g');
  const matches = xml.match(regex);
  return matches ? matches.length : 0;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
