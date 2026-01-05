import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { PdfGeneratorOptions, documentTypeLabels, documentTypePrefixes, serviceTypeLabels } from './types';
import { sanitizePdfText, renderRichText, formatCurrency, drawCheckmark } from './text';

// Logo path for the company
const LOGO_PATH = '/images/cipherx-logo.png';

/**
 * Loads an image and returns it as a data URL
 */
const loadImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

/**
 * Generates a professional PDF for export/download with cover pages and table of contents
 */
export const generateExportPdf = async (options: PdfGeneratorOptions): Promise<jsPDF> => {
  const { document, sections, pricingData, pricingItems, signatures, companySettings, clientContact } = options;
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  const docNumber = generateDocumentNumber(document);
  
  // Load logo
  const logoData = await loadImageAsDataUrl(LOGO_PATH);
  
  // Track page numbers for TOC
  const tocEntries: { title: string; page: number }[] = [];
  let currentPageNum = 1;

  // ===== PAGE 1: DOCUMENT COVER PAGE =====
  await renderDocumentCoverPage(pdf, {
    pageWidth,
    pageHeight,
    margin,
    contentWidth,
    companySettings,
    document,
    clientContact,
    docNumber,
    logoData
  });
  
  currentPageNum++;
  
  // ===== PAGE 2: TABLE OF CONTENTS =====
  pdf.addPage();
  
  // Build TOC entries - sections start at page 3
  let pageCounter = 3;
  sections.forEach((section, idx) => {
    tocEntries.push({ title: `${idx + 1}. ${section.title}`, page: pageCounter });
    // Estimate pages per section (simplified - 1 page per section)
    pageCounter++;
  });
  
  if (pricingItems.length > 0) {
    tocEntries.push({ title: 'Pricing Summary', page: pageCounter });
    pageCounter++;
  }
  
  if (signatures && signatures.length > 0) {
    tocEntries.push({ title: 'Signatures', page: pageCounter });
  }
  
  renderTableOfContents(pdf, {
    pageWidth,
    pageHeight,
    margin,
    contentWidth,
    tocEntries,
    companySettings,
    logoData
  });
  
  currentPageNum++;

  // ===== CONTENT PAGES =====
  const addMinimalHeader = (p: jsPDF) => {
    p.setFontSize(9);
    p.setFont('helvetica', 'normal');
    p.setTextColor(100, 100, 100);
    p.text(sanitizePdfText(companySettings?.company_name || 'CipherX Solutions Inc.'), margin, 12);
    
    // Small logo on right
    if (logoData) {
      try {
        p.addImage(logoData, 'PNG', pageWidth - margin - 12, 5, 12, 12, undefined, 'FAST');
      } catch {
        // Fallback if image fails
      }
    }
  };
  
  const addMinimalFooter = (p: jsPDF, pageNum: number) => {
    p.setDrawColor(200, 200, 200);
    p.setLineWidth(0.3);
    p.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
    
    p.setFontSize(8);
    p.setFont('helvetica', 'normal');
    p.setTextColor(100, 100, 100);
    
    const footerText = '141-3166 Lenworth Dr | cpxs.ca | 6475245320 | info@cpxs.ca';
    p.text(footerText, pageWidth / 2, pageHeight - 12, { align: 'center' });
    
    p.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
  };

  // Render each section
  sections.forEach((section, idx) => {
    pdf.addPage();
    
    addMinimalHeader(pdf);
    
    // Section title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text(sanitizePdfText(`${idx + 1}. ${section.title}`), margin, 30);
    
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(margin, 35, pageWidth - margin, 35);
    
    const addPageHeader = (p: jsPDF) => {
      addMinimalHeader(p);
      p.setFontSize(10);
      p.setFont('helvetica', 'normal');
      p.setTextColor(150, 150, 150);
      p.text(sanitizePdfText(`${section.title} (continued)`), margin, 25);
      p.setDrawColor(200, 200, 200);
      p.line(margin, 28, pageWidth - margin, 28);
    };
    
    renderRichText(pdf, section.content || '', {
      startX: margin,
      startY: 45,
      maxWidth: contentWidth,
      pageHeight,
      margin,
      primaryColor: '#374151',
      addPageHeader,
      isMonochrome: true,
    });
    
    addMinimalFooter(pdf, currentPageNum);
    currentPageNum++;
  });
  
  // ===== PRICING PAGE =====
  if (pricingItems.length > 0) {
    pdf.addPage();
    addMinimalHeader(pdf);
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text('Pricing Summary', margin, 30);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, 35, pageWidth - margin, 35);
    
    let tableY = 50;
    
    // Table header
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, tableY - 5, contentWidth, 12, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(60, 60, 60);
    pdf.text('Description', margin + 3, tableY + 3);
    pdf.text('Qty', margin + 100, tableY + 3);
    pdf.text('Price', margin + 120, tableY + 3);
    pdf.text('Total', pageWidth - margin - 3, tableY + 3, { align: 'right' });
    tableY += 14;
    
    pricingItems.forEach((item) => {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(31, 41, 55);
      pdf.text(sanitizePdfText(item.description || item.name || 'Unnamed Item').slice(0, 45), margin + 3, tableY);
      pdf.text(item.quantity.toString(), margin + 100, tableY);
      pdf.text(formatCurrency(item.unitPrice), margin + 120, tableY);
      pdf.setFont('helvetica', 'bold');
      pdf.text(formatCurrency(item.quantity * item.unitPrice), pageWidth - margin - 3, tableY, { align: 'right' });
      tableY += 10;
    });
    
    // Subtotal, discount, HST, total
    tableY += 5;
    pdf.setDrawColor(100, 100, 100);
    pdf.line(margin + 100, tableY, pageWidth - margin, tableY);
    tableY += 10;
    
    if (pricingData.subtotal) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(31, 41, 55);
      pdf.text('Subtotal:', margin + 100, tableY);
      pdf.text(formatCurrency(pricingData.subtotal), pageWidth - margin - 3, tableY, { align: 'right' });
      tableY += 8;
    }
    
    if (pricingData.discountAmount && pricingData.discountAmount > 0) {
      pdf.setTextColor(34, 139, 34);
      pdf.text(`Discount (${pricingData.discountPercent || 0}%):`, margin + 100, tableY);
      pdf.text(`-${formatCurrency(pricingData.discountAmount)}`, pageWidth - margin - 3, tableY, { align: 'right' });
      tableY += 8;
      pdf.setTextColor(31, 41, 55);
    }
    
    // HST Tax
    if (pricingData.includeHst && pricingData.hstAmount) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(31, 41, 55);
      pdf.text(`HST (${pricingData.hstRate || 13}%):`, margin + 100, tableY);
      pdf.text(formatCurrency(pricingData.hstAmount), pageWidth - margin - 3, tableY, { align: 'right' });
      tableY += 8;
    }
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total:', margin + 100, tableY);
    pdf.text(formatCurrency(pricingData.total || 0), pageWidth - margin - 3, tableY, { align: 'right' });
    
    addMinimalFooter(pdf, currentPageNum);
    currentPageNum++;
  }
  
  // ===== SIGNATURE PAGE =====
  if (signatures && signatures.length > 0) {
    pdf.addPage();
    addMinimalHeader(pdf);
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text('Agreement and Signatures', margin, 30);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, 35, pageWidth - margin, 35);
    
    // Agreement quote box
    const agreementBoxY = 48;
    pdf.setFillColor(250, 250, 252);
    pdf.rect(margin, agreementBoxY, contentWidth, 28, 'F');
    pdf.setDrawColor(100, 100, 100);
    pdf.setLineWidth(1);
    pdf.line(margin, agreementBoxY, margin, agreementBoxY + 28);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(80, 80, 80);
    const agreementText = 'By signing below, the parties acknowledge that they have read, understood, and agree to be bound by the terms and conditions set forth in this proposal. This agreement shall be effective upon execution by both parties.';
    const wrappedAgreement = pdf.splitTextToSize(agreementText, contentWidth - 10);
    pdf.text(wrappedAgreement, margin + 5, agreementBoxY + 10);
    
    // Split signatures into service provider (CipherX) and client
    const cipherxSigners = signatures.filter(s => s.signer_role.toLowerCase().includes('cipherx') || s.signer_role.toLowerCase().includes('service provider') || s.signer_role.toLowerCase() === 'company representative');
    const clientSigners = signatures.filter(s => s.signer_role.toLowerCase().includes('client') || !cipherxSigners.includes(s));
    
    // Two-column layout with consistent positioning
    const colGap = 15;
    const halfWidth = (contentWidth - colGap) / 2;
    const leftColX = margin;
    const rightColX = margin + halfWidth + colGap;
    
    // Header row Y position
    const headerY = 88;
    
    // === LEFT COLUMN: SERVICE PROVIDER ===
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text('SERVICE PROVIDER', leftColX, headerY);
    
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.line(leftColX, headerY + 3, leftColX + halfWidth, headerY + 3);
    
    // Company name
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text(sanitizePdfText(companySettings?.company_name || 'CipherX Solutions Inc.'), leftColX, headerY + 12);
    
    // === RIGHT COLUMN: CLIENT ===
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text('CLIENT', rightColX, headerY);
    
    pdf.setDrawColor(200, 200, 200);
    pdf.line(rightColX, headerY + 3, rightColX + halfWidth, headerY + 3);
    
    // Client company name
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(sanitizePdfText(document.clients?.company_name || 'Client Company'), rightColX, headerY + 12);
    
    // Signature area starts at same Y for both columns
    const signatureAreaY = headerY + 30;
    const lineWidth = halfWidth - 5;
    
    // Get signer info
    const mainCipherxSigner = cipherxSigners[0] || signatures.find(s => !s.signer_role.toLowerCase().includes('client'));
    const mainClientSigner = clientSigners[0];
    const clientSigner = mainClientSigner || (clientContact ? { 
      signer_name: clientContact.full_name, 
      signer_email: clientContact.email, 
      position: clientContact.job_title,
      signed_at: null, 
      signature_data: null 
    } : null);
    
    // === LEFT COLUMN (Service Provider) Signature Block ===
    pdf.setDrawColor(150, 150, 150);
    pdf.setLineWidth(0.5);
    
    // Draw signature if exists
    if (mainCipherxSigner?.signed_at && mainCipherxSigner?.signature_data) {
      try {
        pdf.addImage(mainCipherxSigner.signature_data, 'PNG', leftColX, signatureAreaY, 60, 20, undefined, 'FAST');
      } catch {
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text('[Signature on file]', leftColX + lineWidth / 2, signatureAreaY + 10, { align: 'center' });
      }
    }
    
    // Signature line
    pdf.line(leftColX, signatureAreaY + 25, leftColX + lineWidth, signatureAreaY + 25);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Authorized Signature', leftColX, signatureAreaY + 30);
    
    // Name (bold, uppercase)
    const cipherxSignerName = mainCipherxSigner?.signer_name?.toUpperCase() || '';
    const cipherxSignerPosition = mainCipherxSigner?.position || '';
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text(sanitizePdfText(cipherxSignerName), leftColX, signatureAreaY + 42);
    
    // Position (italic, smaller)
    if (cipherxSignerPosition) {
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(80, 80, 80);
      pdf.text(sanitizePdfText(cipherxSignerPosition), leftColX, signatureAreaY + 47);
    }
    
    // Representative line
    pdf.setDrawColor(150, 150, 150);
    pdf.line(leftColX, signatureAreaY + 55, leftColX + lineWidth, signatureAreaY + 55);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Authorized Representative', leftColX, signatureAreaY + 60);
    
    // Date section
    if (mainCipherxSigner?.signed_at) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(31, 41, 55);
      pdf.text(format(new Date(mainCipherxSigner.signed_at), 'MMMM d, yyyy'), leftColX, signatureAreaY + 72);
    }
    pdf.setDrawColor(150, 150, 150);
    pdf.line(leftColX, signatureAreaY + 76, leftColX + lineWidth, signatureAreaY + 76);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Date', leftColX, signatureAreaY + 81);
    
    // === RIGHT COLUMN (Client) Signature Block ===
    // Draw signature if exists
    if (mainClientSigner?.signed_at && mainClientSigner?.signature_data) {
      try {
        pdf.addImage(mainClientSigner.signature_data, 'PNG', rightColX, signatureAreaY, 60, 20, undefined, 'FAST');
      } catch {
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text('[Signature on file]', rightColX + lineWidth / 2, signatureAreaY + 10, { align: 'center' });
      }
    }
    
    // Signature line
    pdf.setDrawColor(150, 150, 150);
    pdf.line(rightColX, signatureAreaY + 25, rightColX + lineWidth, signatureAreaY + 25);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Authorized Signature', rightColX, signatureAreaY + 30);
    
    // Name (bold, uppercase)
    const clientSignerName = (clientSigner?.signer_name || clientContact?.full_name || '')?.toUpperCase();
    const clientSignerPosition = (clientSigner as any)?.position || clientContact?.job_title || '';
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text(sanitizePdfText(clientSignerName), rightColX, signatureAreaY + 42);
    
    // Position (italic, smaller)
    if (clientSignerPosition) {
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(80, 80, 80);
      pdf.text(sanitizePdfText(clientSignerPosition), rightColX, signatureAreaY + 47);
    }
    
    // Representative line
    pdf.setDrawColor(150, 150, 150);
    pdf.line(rightColX, signatureAreaY + 55, rightColX + lineWidth, signatureAreaY + 55);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Authorized Representative', rightColX, signatureAreaY + 60);
    
    // Date section
    if (mainClientSigner?.signed_at) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(31, 41, 55);
      pdf.text(format(new Date(mainClientSigner.signed_at), 'MMMM d, yyyy'), rightColX, signatureAreaY + 72);
    }
    pdf.setDrawColor(150, 150, 150);
    pdf.line(rightColX, signatureAreaY + 76, rightColX + lineWidth, signatureAreaY + 76);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Date', rightColX, signatureAreaY + 81);
    
    addMinimalFooter(pdf, currentPageNum);
  }
  
  return pdf;
};

/**
 * Renders Page 1: Document Cover Page
 */
const renderDocumentCoverPage = async (
  pdf: jsPDF,
  opts: {
    pageWidth: number;
    pageHeight: number;
    margin: number;
    contentWidth: number;
    companySettings: PdfGeneratorOptions['companySettings'];
    document: PdfGeneratorOptions['document'];
    clientContact: PdfGeneratorOptions['clientContact'];
    docNumber: string;
    logoData: string | null;
  }
) => {
  const { pageWidth, pageHeight, margin, contentWidth, companySettings, document, clientContact, docNumber, logoData } = opts;
  
  // ===== HEADER SECTION =====
  // Elegant top border accent
  pdf.setFillColor(31, 41, 55);
  pdf.rect(0, 0, pageWidth, 3, 'F');
  
  let headerY = 20;
  
  // Left side: Logo | Company Name + Description
  let logoEndX = margin;
  if (logoData) {
    try {
      pdf.addImage(logoData, 'PNG', margin, 14, 16, 16, undefined, 'FAST');
      logoEndX = margin + 20;
    } catch {
      // Fallback if logo fails
    }
  }
  
  // Company Name (Bold, larger)
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(sanitizePdfText(companySettings?.company_name || 'CIPHERX SOLUTIONS INC.'), logoEndX, headerY);
  
  // Company Description (smaller, italic style)
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(120, 120, 120);
  pdf.text(sanitizePdfText(companySettings?.description || '(MSP) IT, Web, Design & Cyber-Security Services'), logoEndX, headerY + 5);
  
  // Right side: Company details (right-aligned, structured)
  const rightX = pageWidth - margin;
  let rightY = 12;
  
  // CEO/Director Name (Bold, prominent)
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(sanitizePdfText(companySettings?.ceo_director_name || 'Director'), rightX, rightY, { align: 'right' });
  rightY += 5;
  
  // Tax ID - structured format
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(`TAX ID: ${sanitizePdfText(companySettings?.tax_number || '706245354RT0001')}`, rightX, rightY, { align: 'right' });
  rightY += 4;
  
  // Contact info in compact format
  pdf.text(sanitizePdfText(companySettings?.email || 'info@cpxs.ca'), rightX, rightY, { align: 'right' });
  rightY += 4;
  pdf.text(sanitizePdfText(companySettings?.phone || '6475245320'), rightX, rightY, { align: 'right' });
  rightY += 4;
  pdf.text(sanitizePdfText(companySettings?.website || 'cpxs.ca'), rightX, rightY, { align: 'right' });
  rightY += 5;
  
  // Business Address
  pdf.setFontSize(7);
  pdf.setTextColor(130, 130, 130);
  const addressParts = [
    companySettings?.address_line1 || '141-3166 Lenworth Dr',
    companySettings?.city || 'Mississauga',
    companySettings?.postal_code || 'L4X 2G1'
  ].filter(Boolean);
  pdf.text(sanitizePdfText(addressParts.join(', ')), rightX, rightY, { align: 'right' });
  
  // Elegant header separator
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.3);
  pdf.line(margin, 38, pageWidth - margin, 38);
  
  // ===== CENTER CONTENT (Structured, elegant layout) =====
  let centerY = 52;
  
  // Document ID section with subtle background
  pdf.setFillColor(250, 250, 252);
  pdf.rect(margin, centerY - 6, contentWidth, 16, 'F');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(130, 130, 130);
  pdf.text('DOCUMENT ID', margin + 4, centerY);
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(docNumber, margin + 4, centerY + 6);
  
  centerY += 22;
  
  // Document Type Badge (elegant, minimal)
  const docTypeLabel = (documentTypeLabels[document.document_type] || 'Document').toUpperCase();
  pdf.setFontSize(8);
  const badgeWidth = pdf.getTextWidth(docTypeLabel) + 14;
  const badgeHeight = 8;
  
  // Subtle outlined badge
  pdf.setFillColor(245, 250, 255);
  pdf.setDrawColor(180, 200, 230);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(margin, centerY - 5.5, badgeWidth, badgeHeight, 1.5, 1.5, 'FD');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(80, 120, 170);
  pdf.text(docTypeLabel, margin + 7, centerY);
  centerY += 14;
  
  // Document Title (elegant, properly sized)
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  const titleLines = pdf.splitTextToSize(sanitizePdfText(document.title), contentWidth - 10);
  pdf.text(titleLines, margin, centerY);
  centerY += (titleLines.length * 7) + 10;
  
  // Subtle divider
  pdf.setDrawColor(230, 230, 230);
  pdf.setLineWidth(0.2);
  pdf.line(margin, centerY - 4, margin + 60, centerY - 4);
  
  // Service Type - Label normal, Value bold
  const serviceLabel = serviceTypeLabels[document.service_type] || document.service_type;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Service Type:', margin, centerY);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(sanitizePdfText(serviceLabel), margin + 28, centerY);
  centerY += 7;
  
  // Date - Label normal, Value bold
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Date:', margin, centerY);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(format(new Date(document.created_at), 'MMMM d, yyyy'), margin + 28, centerY);
  
  // ===== FOOTER SECTION: PREPARED FOR (Elegant structured layout) =====
  // Subtle background for footer section
  pdf.setFillColor(250, 250, 252);
  pdf.rect(margin, pageHeight - 78, contentWidth, 60, 'F');
  
  // Top border accent
  pdf.setDrawColor(31, 41, 55);
  pdf.setLineWidth(0.8);
  pdf.line(margin, pageHeight - 78, pageWidth - margin, pageHeight - 78);
  
  let footerY = pageHeight - 70;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text('PREPARED FOR', margin + 4, footerY);
  
  footerY += 10;
  
  // Two-column layout with elegant spacing
  const leftCol = margin + 4;
  const rightCol = pageWidth / 2 + 5;
  
  // Left column: Primary Contact
  let leftY = footerY;
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(130, 130, 130);
  pdf.text('PRIMARY CONTACT', leftCol, leftY);
  leftY += 6;
  
  pdf.setFontSize(9);
  pdf.setTextColor(31, 41, 55);
  
  if (clientContact?.full_name) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(sanitizePdfText(clientContact.full_name), leftCol, leftY);
    leftY += 5;
  }
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  if (clientContact?.email) {
    pdf.text(sanitizePdfText(clientContact.email), leftCol, leftY);
    leftY += 4;
  }
  if (clientContact?.phone) {
    pdf.text(sanitizePdfText(clientContact.phone), leftCol, leftY);
  }
  
  // Vertical divider between columns
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.3);
  pdf.line(pageWidth / 2, footerY - 4, pageWidth / 2, pageHeight - 24);
  
  // Right column: Company Information
  let rightFooterY = footerY;
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(130, 130, 130);
  pdf.text('COMPANY', rightCol, rightFooterY);
  rightFooterY += 6;
  
  pdf.setFontSize(9);
  pdf.setTextColor(31, 41, 55);
  
  if (document.clients?.company_name) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(sanitizePdfText(document.clients.company_name), rightCol, rightFooterY);
    rightFooterY += 5;
  }
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  if (document.clients?.industry) {
    pdf.text(sanitizePdfText(document.clients.industry), rightCol, rightFooterY);
    rightFooterY += 4;
  }
  if (document.clients?.website) {
    pdf.text(sanitizePdfText(document.clients.website), rightCol, rightFooterY);
    rightFooterY += 4;
  }
  
  // Client address
  const clientAddressParts = [
    document.clients?.address_line1,
    document.clients?.address_line2,
    document.clients?.city,
    document.clients?.province,
    document.clients?.postal_code
  ].filter(Boolean);
  
  if (clientAddressParts.length > 0) {
    const addressLine = sanitizePdfText(clientAddressParts.join(', '));
    const wrappedAddress = pdf.splitTextToSize(addressLine, (pageWidth / 2) - margin - 10);
    wrappedAddress.forEach((line: string) => {
      pdf.text(line, rightCol, rightFooterY);
      rightFooterY += 5;
    });
  }
};

/**
 * Renders Page 2: Table of Contents
 */
const renderTableOfContents = (
  pdf: jsPDF,
  opts: {
    pageWidth: number;
    pageHeight: number;
    margin: number;
    contentWidth: number;
    tocEntries: { title: string; page: number }[];
    companySettings: PdfGeneratorOptions['companySettings'];
    logoData: string | null;
  }
) => {
  const { pageWidth, pageHeight, margin, contentWidth, tocEntries, companySettings, logoData } = opts;
  
  // Minimal header
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(sanitizePdfText(companySettings?.company_name || 'CipherX Solutions Inc.'), margin, 12);
  
  if (logoData) {
    try {
      pdf.addImage(logoData, 'PNG', pageWidth - margin - 12, 5, 12, 12, undefined, 'FAST');
    } catch {
      // Fallback if image fails
    }
  }
  
  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text('Table of Contents', margin, 40);
  
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(margin, 45, pageWidth - margin, 45);
  
  // TOC entries
  let tocY = 60;
  
  tocEntries.forEach((entry, idx) => {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(31, 41, 55);
    
    // Entry title
    const entryTitle = sanitizePdfText(entry.title);
    pdf.text(entryTitle, margin, tocY);
    
    // Page number
    pdf.text(entry.page.toString(), pageWidth - margin, tocY, { align: 'right' });
    
    // Dotted line
    const titleWidth = pdf.getTextWidth(entryTitle);
    const pageNumWidth = pdf.getTextWidth(entry.page.toString());
    const dotsStart = margin + titleWidth + 5;
    const dotsEnd = pageWidth - margin - pageNumWidth - 5;
    
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.2);
    
    // Draw dots
    let dotX = dotsStart;
    while (dotX < dotsEnd) {
      pdf.circle(dotX, tocY - 1.5, 0.3, 'F');
      dotX += 3;
    }
    
    tocY += 12;
  });
  
  // Footer
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('141-3166 Lenworth Dr | cpxs.ca | 6475245320 | info@cpxs.ca', pageWidth / 2, pageHeight - 12, { align: 'center' });
  pdf.text('Page 2', pageWidth - margin, pageHeight - 12, { align: 'right' });
};

const generateDocumentNumber = (document: PdfGeneratorOptions['document']): string => {
  const prefix = documentTypePrefixes[document.document_type] || 'DOC';
  const year = new Date(document.created_at).getFullYear();
  const idSuffix = document.id.slice(-4).toUpperCase();
  return `${prefix}-${year}-${idSuffix || '0001'}`;
};
