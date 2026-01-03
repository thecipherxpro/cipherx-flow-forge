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

  // ===== PAGE 1: COMPANY COVER PAGE =====
  await renderCompanyCoverPage(pdf, {
    pageWidth,
    pageHeight,
    margin,
    contentWidth,
    companySettings,
    docNumber,
    document,
    logoData
  });
  
  currentPageNum++;
  
  // ===== PAGE 2: DOCUMENT COVER PAGE =====
  pdf.addPage();
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
  
  // ===== PAGE 3: TABLE OF CONTENTS =====
  pdf.addPage();
  
  // Build TOC entries - sections start at page 4
  let pageCounter = 4;
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
    pdf.text('Item', margin + 3, tableY + 3);
    pdf.text('Qty', margin + 100, tableY + 3);
    pdf.text('Price', margin + 120, tableY + 3);
    pdf.text('Total', pageWidth - margin - 3, tableY + 3, { align: 'right' });
    tableY += 14;
    
    pricingItems.forEach((item) => {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(31, 41, 55);
      pdf.text(sanitizePdfText(item.name || 'Item').slice(0, 40), margin + 3, tableY);
      pdf.text(item.quantity.toString(), margin + 100, tableY);
      pdf.text(formatCurrency(item.unitPrice), margin + 120, tableY);
      pdf.setFont('helvetica', 'bold');
      pdf.text(formatCurrency(item.quantity * item.unitPrice), pageWidth - margin - 3, tableY, { align: 'right' });
      tableY += 10;
    });
    
    // Subtotal, discount, total
    tableY += 5;
    pdf.setDrawColor(100, 100, 100);
    pdf.line(margin + 100, tableY, pageWidth - margin, tableY);
    tableY += 10;
    
    if (pricingData.subtotal) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
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
    pdf.text('Signatures', margin, 30);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, 35, pageWidth - margin, 35);
    
    let sigY = 50;
    for (const sig of signatures) {
      pdf.setDrawColor(220, 220, 220);
      pdf.rect(margin, sigY, contentWidth, 55);
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(100, 100, 100);
      pdf.text(sanitizePdfText(sig.signer_role.toUpperCase()), margin + 5, sigY + 10);
      
      pdf.setFontSize(11);
      pdf.setTextColor(31, 41, 55);
      pdf.text(sanitizePdfText(sig.signer_name), margin + 5, sigY + 20);
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(sanitizePdfText(sig.signer_email), margin + 5, sigY + 28);
      
      // Signature area
      const sigAreaX = margin + contentWidth / 2;
      if (sig.signed_at && sig.signature_data) {
        try {
          pdf.addImage(sig.signature_data, 'PNG', sigAreaX, sigY + 5, 60, 25, undefined, 'FAST');
        } catch {
          pdf.setTextColor(100, 100, 100);
          pdf.text('[Signature on file]', sigAreaX + 30, sigY + 20, { align: 'center' });
        }
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Signed: ${format(new Date(sig.signed_at), 'MMM d, yyyy h:mm a')}`, sigAreaX, sigY + 38);
        if (sig.ip_address) pdf.text(`IP: ${sanitizePdfText(String(sig.ip_address))}`, sigAreaX, sigY + 46);
      } else {
        pdf.setDrawColor(180, 180, 180);
        pdf.line(sigAreaX, sigY + 35, sigAreaX + 60, sigY + 35);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Pending signature', sigAreaX + 30, sigY + 42, { align: 'center' });
      }
      sigY += 65;
    }
    
    addMinimalFooter(pdf, currentPageNum);
  }
  
  return pdf;
};

/**
 * Renders Page 1: Company Cover Page
 */
const renderCompanyCoverPage = async (
  pdf: jsPDF,
  opts: {
    pageWidth: number;
    pageHeight: number;
    margin: number;
    contentWidth: number;
    companySettings: PdfGeneratorOptions['companySettings'];
    docNumber: string;
    document: PdfGeneratorOptions['document'];
    logoData: string | null;
  }
) => {
  const { pageWidth, pageHeight, margin, contentWidth, companySettings, docNumber, document, logoData } = opts;
  
  // ===== SECTION 1: HEADER =====
  // Logo and company name
  let headerY = 25;
  
  if (logoData) {
    try {
      pdf.addImage(logoData, 'PNG', margin, 15, 25, 25, undefined, 'FAST');
      headerY = 20;
    } catch {
      // Fallback if logo fails
    }
  }
  
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(sanitizePdfText(companySettings?.company_name || 'CIPHERX SOLUTIONS INC.'), margin + 32, headerY + 5);
  
  // Company contact info
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  
  const contactLine1 = [
    companySettings?.website || 'cpxs.ca',
    companySettings?.phone || '6475245320',
    companySettings?.email || 'info@cpxs.ca'
  ].filter(Boolean).join(' | ');
  pdf.text(sanitizePdfText(contactLine1), margin + 32, headerY + 14);
  
  // Business numbers
  const binLine = `Business Number (BIN): ${companySettings?.business_number || '706245354'}`;
  const hstLine = `(HST/GST) #: ${companySettings?.tax_number || '706245354RT0001'}`;
  pdf.text(sanitizePdfText(binLine), margin + 32, headerY + 22);
  pdf.text(sanitizePdfText(hstLine), margin + 32, headerY + 30);
  
  // Separator line
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(margin, 60, pageWidth - margin, 60);
  
  // ===== SECTION 2: DOCUMENT INFO =====
  const centerY = pageHeight / 2 - 30;
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('DOCUMENT ID', pageWidth / 2, centerY, { align: 'center' });
  
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(docNumber, pageWidth / 2, centerY + 12, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('SERVICE TYPE', pageWidth / 2, centerY + 35, { align: 'center' });
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  const serviceLabel = serviceTypeLabels[document.service_type] || document.service_type;
  pdf.text(sanitizePdfText(serviceLabel), pageWidth / 2, centerY + 47, { align: 'center' });
  
  // ===== SECTION 3: FOOTER =====
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(margin, pageHeight - 35, pageWidth - margin, pageHeight - 35);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  
  // Build full address
  const addressParts = [
    companySettings?.address_line1 || '141-3166 Lenworth Dr',
    companySettings?.address_line2,
    companySettings?.city || 'Mississauga',
    companySettings?.province || 'Ontario',
    companySettings?.postal_code || 'L4X 2G1',
    companySettings?.country || 'Canada'
  ].filter(Boolean);
  
  const addressLine = addressParts.join(', ');
  pdf.text(sanitizePdfText(addressLine), pageWidth / 2, pageHeight - 25, { align: 'center' });
  
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text('Company Business Address', pageWidth / 2, pageHeight - 18, { align: 'center' });
};

/**
 * Renders Page 2: Document Cover Page
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
  // Left: Logo and company name
  let logoEndX = margin;
  if (logoData) {
    try {
      pdf.addImage(logoData, 'PNG', margin, 15, 20, 20, undefined, 'FAST');
      logoEndX = margin + 25;
    } catch {
      // Fallback if logo fails
    }
  }
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(sanitizePdfText(companySettings?.company_name || 'CIPHERX SOLUTIONS INC.'), logoEndX, 23);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(sanitizePdfText(companySettings?.description || '(MSP) IT, Web, Design & Cyber-Security Services'), logoEndX, 31);
  
  // Right: Document number
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 100, 100);
  pdf.text(docNumber, pageWidth - margin, 20, { align: 'right' });
  
  // ===== CENTER CONTENT =====
  const centerY = pageHeight / 2 - 40;
  
  // Document Type Badge
  const docTypeLabel = (documentTypeLabels[document.document_type] || 'Document').toUpperCase();
  pdf.setFillColor(31, 41, 55);
  const badgeWidth = pdf.getTextWidth(docTypeLabel) + 20;
  pdf.roundedRect(pageWidth / 2 - badgeWidth / 2, centerY - 8, badgeWidth, 14, 2, 2, 'F');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text(docTypeLabel, pageWidth / 2, centerY, { align: 'center' });
  
  // Document Title (H2)
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  const titleLines = pdf.splitTextToSize(sanitizePdfText(document.title), contentWidth - 20);
  pdf.text(titleLines, pageWidth / 2, centerY + 25, { align: 'center' });
  
  // Service Type (H4)
  const serviceLabel = serviceTypeLabels[document.service_type] || document.service_type;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  const serviceLabelY = centerY + 25 + (titleLines.length * 10) + 15;
  pdf.text(sanitizePdfText(serviceLabel), pageWidth / 2, serviceLabelY, { align: 'center' });
  
  // Date
  pdf.setFontSize(11);
  pdf.setTextColor(100, 100, 100);
  pdf.text(format(new Date(document.created_at), 'MMMM d, yyyy'), pageWidth / 2, serviceLabelY + 15, { align: 'center' });
  
  // ===== FOOTER SECTION =====
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(margin, pageHeight - 90, pageWidth - margin, pageHeight - 90);
  
  // Prepared For section
  let footerY = pageHeight - 82;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text('PREPARED FOR', margin, footerY);
  
  footerY += 8;
  
  // Two-column layout
  const leftCol = margin;
  const rightCol = pageWidth / 2 + 10;
  
  // Left column: Primary Contact
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 100, 100);
  pdf.text('PRIMARY CONTACT', leftCol, footerY);
  footerY += 6;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(31, 41, 55);
  
  if (clientContact?.full_name) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(sanitizePdfText(clientContact.full_name), leftCol, footerY);
    pdf.setFont('helvetica', 'normal');
    footerY += 5;
  }
  if (clientContact?.job_title) {
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(sanitizePdfText(clientContact.job_title), leftCol, footerY);
    footerY += 5;
  }
  if (clientContact?.email) {
    pdf.setFontSize(9);
    pdf.setTextColor(31, 41, 55);
    pdf.text(sanitizePdfText(clientContact.email), leftCol, footerY);
    footerY += 5;
  }
  if (clientContact?.phone) {
    pdf.text(sanitizePdfText(clientContact.phone), leftCol, footerY);
    footerY += 5;
  }
  
  // Right column: Company Information
  let rightFooterY = pageHeight - 74;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 100, 100);
  pdf.text('COMPANY INFORMATION', rightCol, rightFooterY);
  rightFooterY += 6;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(31, 41, 55);
  
  if (document.clients?.company_name) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(sanitizePdfText(document.clients.company_name), rightCol, rightFooterY);
    pdf.setFont('helvetica', 'normal');
    rightFooterY += 5;
  }
  if (document.clients?.industry) {
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(sanitizePdfText(document.clients.industry), rightCol, rightFooterY);
    rightFooterY += 5;
  }
  if (document.clients?.website) {
    pdf.setFontSize(9);
    pdf.setTextColor(31, 41, 55);
    pdf.text(sanitizePdfText(document.clients.website), rightCol, rightFooterY);
    rightFooterY += 5;
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
    pdf.text(sanitizePdfText(clientAddressParts.join(', ')), rightCol, rightFooterY);
  }
  
  // Date Issued at bottom
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, pageHeight - 22, pageWidth - margin, pageHeight - 22);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Date Issued: ${format(new Date(), 'MMMM d, yyyy')}`, pageWidth / 2, pageHeight - 14, { align: 'center' });
};

/**
 * Renders Page 3: Table of Contents
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
  pdf.text('Page 3', pageWidth - margin, pageHeight - 12, { align: 'right' });
};

const generateDocumentNumber = (document: PdfGeneratorOptions['document']): string => {
  const prefix = documentTypePrefixes[document.document_type] || 'DOC';
  const year = new Date(document.created_at).getFullYear();
  const idSuffix = document.id.slice(-4).toUpperCase();
  return `${prefix}-${year}-${idSuffix || '0001'}`;
};
