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
  let headerY = 18;
  
  // Left side: Logo | Company Name + Description
  let logoEndX = margin;
  if (logoData) {
    try {
      pdf.addImage(logoData, 'PNG', margin, 12, 18, 18, undefined, 'FAST');
      logoEndX = margin + 22;
    } catch {
      // Fallback if logo fails
    }
  }
  
  // Company Name (Bold, larger)
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(sanitizePdfText(companySettings?.company_name || 'CIPHERX SOLUTIONS INC.'), logoEndX, headerY);
  
  // Company Description (smaller, normal weight)
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(sanitizePdfText(companySettings?.description || '(MSP) IT, Web, Design & Cyber-Security Services'), logoEndX, headerY + 6);
  
  // Right side: Company details (right-aligned)
  const rightX = pageWidth - margin;
  let rightY = 14;
  
  // CEO/Director Name (Bold)
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(sanitizePdfText(companySettings?.ceo_director_name || 'Director'), rightX, rightY, { align: 'right' });
  rightY += 5;
  
  // Tax ID
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  pdf.text(`(HST/GST) TAX ID: ${sanitizePdfText(companySettings?.tax_number || '706245354RT0001')}`, rightX, rightY, { align: 'right' });
  rightY += 4;
  
  // Email
  pdf.text(`Email: ${sanitizePdfText(companySettings?.email || 'info@cpxs.ca')}`, rightX, rightY, { align: 'right' });
  rightY += 4;
  
  // Phone
  pdf.text(`Phone: ${sanitizePdfText(companySettings?.phone || '6475245320')}`, rightX, rightY, { align: 'right' });
  rightY += 4;
  
  // Website
  pdf.text(`Website: ${sanitizePdfText(companySettings?.website || 'cpxs.ca')}`, rightX, rightY, { align: 'right' });
  rightY += 6;
  
  // Business Address
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  const addressParts = [
    companySettings?.address_line1 || '141-3166 Lenworth Dr',
    companySettings?.city || 'Mississauga',
    companySettings?.postal_code || 'L4X 2G1'
  ].filter(Boolean);
  pdf.text(sanitizePdfText(addressParts.join(', ')), rightX, rightY, { align: 'right' });
  
  // Header separator line
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(margin, 42, pageWidth - margin, 42);
  
  // ===== CENTER CONTENT (Left-aligned with reduced spacing) =====
  let centerY = 60;
  
  // Document ID
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 100, 100);
  pdf.text('DOCUMENT ID:', margin, centerY);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(31, 41, 55);
  pdf.text(docNumber, margin + 32, centerY);
  centerY += 12;
  
  // Document Type Badge (smaller, outlined style like in the image)
  const docTypeLabel = (documentTypeLabels[document.document_type] || 'Document').toUpperCase();
  pdf.setFontSize(9);
  const badgeWidth = pdf.getTextWidth(docTypeLabel) + 16;
  const badgeHeight = 10;
  
  // Outlined badge (light background with border)
  pdf.setFillColor(240, 248, 255);
  pdf.setDrawColor(100, 149, 237);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, centerY - 7, badgeWidth, badgeHeight, 2, 2, 'FD');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(70, 130, 180);
  pdf.text(docTypeLabel, margin + 8, centerY);
  centerY += 14;
  
  // Document Title (smaller than before)
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  const titleLines = pdf.splitTextToSize(sanitizePdfText(document.title), contentWidth - 20);
  pdf.text(titleLines, margin, centerY);
  centerY += (titleLines.length * 8) + 6;
  
  // Service Type
  const serviceLabel = serviceTypeLabels[document.service_type] || document.service_type;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  pdf.text(`SERVICE TYPE: ${sanitizePdfText(serviceLabel)}`, margin, centerY);
  centerY += 8;
  
  // Date
  pdf.text(`DATE: ${format(new Date(document.created_at), 'MMMM d, yyyy')}`, margin, centerY);
  
  // ===== FOOTER SECTION: PREPARED FOR =====
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(margin, pageHeight - 75, pageWidth - margin, pageHeight - 75);
  
  let footerY = pageHeight - 68;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text('PREPARED FOR', margin, footerY);
  
  footerY += 10;
  
  // Two-column layout
  const leftCol = margin;
  const rightCol = pageWidth / 2 + 10;
  
  // Left column: Primary Contact
  let leftY = footerY;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 100, 100);
  pdf.text('PRIMARY CONTACT', leftCol, leftY);
  leftY += 7;
  
  pdf.setTextColor(31, 41, 55);
  
  if (clientContact?.full_name) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(sanitizePdfText(clientContact.full_name), leftCol, leftY);
    leftY += 6;
  }
  
  pdf.setFont('helvetica', 'normal');
  if (clientContact?.email) {
    pdf.text(sanitizePdfText(clientContact.email), leftCol, leftY);
    leftY += 5;
  }
  if (clientContact?.phone) {
    pdf.text(sanitizePdfText(clientContact.phone), leftCol, leftY);
  }
  
  // Right column: Company Information
  let rightFooterY = footerY;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 100, 100);
  pdf.text('COMPANY INFORMATION', rightCol, rightFooterY);
  rightFooterY += 7;
  
  pdf.setTextColor(31, 41, 55);
  
  if (document.clients?.company_name) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(sanitizePdfText(document.clients.company_name), rightCol, rightFooterY);
    rightFooterY += 6;
  }
  
  pdf.setFont('helvetica', 'normal');
  if (document.clients?.industry) {
    pdf.text(sanitizePdfText(document.clients.industry), rightCol, rightFooterY);
    rightFooterY += 5;
  }
  if (document.clients?.website) {
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
