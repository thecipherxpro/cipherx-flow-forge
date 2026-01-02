import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  PdfGeneratorOptions,
  documentTypeLabels,
  documentTypePrefixes,
  serviceTypeLabels,
} from './types';
import {
  sanitizePdfText,
  hexToRgb,
  renderRichText,
  formatCurrency,
  drawCheckmark,
} from './text';

/**
 * Generates a branded/graphical PDF for printing
 */
export const generatePrintPdf = async (options: PdfGeneratorOptions): Promise<jsPDF> => {
  const { document, sections, pricingData, pricingItems, signatures, companySettings, clientContact } = options;
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  const primaryColor = companySettings?.primary_color || '#6B21A8';
  const secondaryColor = companySettings?.secondary_color || '#A855F7';
  const primaryRgb = hexToRgb(primaryColor);
  const secondaryRgb = hexToRgb(secondaryColor);
  
  const docNumber = generateDocumentNumber(document);
  
  // ===== PAGE 1: COVER PAGE =====
  generateCoverPage(pdf, options, pageWidth, pageHeight, margin, contentWidth, primaryRgb, secondaryRgb);
  
  // ===== PAGE 2: DOCUMENT INFO PAGE =====
  pdf.addPage();
  generateInfoPage(pdf, options, pageWidth, pageHeight, margin, contentWidth, primaryRgb, secondaryRgb, docNumber);
  
  // ===== PAGE 3: TABLE OF CONTENTS =====
  pdf.addPage();
  generateTocPage(pdf, options, pageWidth, pageHeight, margin, contentWidth, primaryRgb, docNumber);
  
  // ===== CONTENT PAGES =====
  let currentPage = 4;
  sections.forEach((section, idx) => {
    pdf.addPage();
    
    const addPageHeader = (p: jsPDF, continued: boolean = false) => {
      p.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      p.rect(0, 0, pageWidth, 30, 'F');
      p.setFontSize(10);
      p.setFont('helvetica', 'normal');
      p.setTextColor(255, 255, 255);
      p.text(sanitizePdfText(`Section ${idx + 1}`), margin, 14);
      p.setFontSize(12);
      p.setFont('helvetica', 'bold');
      p.text(sanitizePdfText(section.title + (continued ? ' (continued)' : '')), margin, 23);
    };
    
    addPageHeader(pdf, false);
    
    renderRichText(pdf, section.content || '', {
      startX: margin,
      startY: 45,
      maxWidth: contentWidth,
      pageHeight,
      margin,
      primaryColor,
      addPageHeader: (p) => addPageHeader(p, true),
      isMonochrome: false,
    });
    
    // Footer
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(156, 163, 175);
    pdf.text(sanitizePdfText(`${document.title} - ${companySettings?.company_name || 'Company'}`), margin, pageHeight - 15);
    pdf.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
    currentPage++;
  });
  
  // ===== PRICING PAGE =====
  if (pricingItems.length > 0) {
    pdf.addPage();
    generatePricingPage(pdf, options, pageWidth, pageHeight, margin, contentWidth, primaryRgb, currentPage);
    currentPage++;
  }
  
  // ===== SIGNATURE PAGE =====
  if (signatures && signatures.length > 0) {
    pdf.addPage();
    await generateSignaturePage(pdf, options, pageWidth, pageHeight, margin, contentWidth, primaryRgb, currentPage);
    currentPage++;
  }
  
  // ===== AUDIT TRAIL PAGE =====
  pdf.addPage();
  generateAuditPage(pdf, options, pageWidth, pageHeight, margin, contentWidth, primaryRgb, docNumber, currentPage);
  
  return pdf;
};

// Helper to generate document number
const generateDocumentNumber = (document: PdfGeneratorOptions['document']): string => {
  const prefix = documentTypePrefixes[document.document_type] || 'DOC';
  const year = new Date(document.created_at).getFullYear();
  const idSuffix = document.id.slice(-3).toUpperCase();
  return `${prefix}-${year}-${idSuffix || '001'}`;
};

// Cover page
const generateCoverPage = (
  pdf: jsPDF,
  options: PdfGeneratorOptions,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number,
  primaryRgb: { r: number; g: number; b: number },
  secondaryRgb: { r: number; g: number; b: number }
) => {
  const { document, companySettings } = options;
  
  // Full page gradient background
  pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Company logo placeholder circle
  pdf.setFillColor(255, 255, 255);
  pdf.circle(pageWidth / 2, 50, 20, 'F');
  
  // Company initials
  const initials = (companySettings?.company_name || 'CX').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  pdf.text(initials, pageWidth / 2, 55, { align: 'center' });
  
  // Company name
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text(sanitizePdfText(companySettings?.company_name || 'Company Name'), pageWidth / 2, 90, { align: 'center' });
  
  // Tagline
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(255, 255, 255);
  pdf.text('Enterprise Technology Solutions', pageWidth / 2, 100, { align: 'center' });
  
  // White content area
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(margin, 120, contentWidth, 110, 5, 5, 'F');
  
  // Document type badge
  const docTypeText = (documentTypeLabels[document.document_type] || 'DOCUMENT').toUpperCase();
  pdf.setFillColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
  const badgeWidth = pdf.getTextWidth(docTypeText) * 0.4 + 16;
  pdf.roundedRect(margin + 15, 130, badgeWidth, 10, 2, 2, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text(docTypeText, margin + 15 + badgeWidth / 2, 137, { align: 'center' });
  
  // Document title
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  const titleLines = pdf.splitTextToSize(sanitizePdfText(document.title), contentWidth - 30);
  pdf.text(titleLines, margin + 15, 160);
  
  // Prepared for section
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('PREPARED FOR', margin + 15, 185);
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(sanitizePdfText(document.clients?.company_name || 'Client'), margin + 15, 195);
  
  // Date section
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('DATE: ' + format(new Date(document.created_at), 'MMMM d, yyyy'), margin + 15, 210);
  
  if (document.expires_at) {
    pdf.text('VALID UNTIL: ' + format(new Date(document.expires_at), 'MMMM d, yyyy'), margin + 15, 218);
  }
  
  // Footer section
  pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  pdf.rect(0, pageHeight - 45, pageWidth, 45, 'F');
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(255, 255, 255);
  
  let footerY = pageHeight - 35;
  if (companySettings?.address_line1) {
    const fullAddress = [
      companySettings.address_line1,
      companySettings.address_line2,
      [companySettings.city, companySettings.province, companySettings.postal_code].filter(Boolean).join(', '),
      companySettings.country
    ].filter(Boolean).join(' - ');
    pdf.text(sanitizePdfText(fullAddress), pageWidth / 2, footerY, { align: 'center' });
    footerY += 7;
  }
  
  const contactLine = [
    companySettings?.phone,
    companySettings?.email,
    companySettings?.website
  ].filter(Boolean).join(' | ');
  if (contactLine) {
    pdf.text(sanitizePdfText(contactLine), pageWidth / 2, footerY, { align: 'center' });
    footerY += 7;
  }
  
  if (companySettings?.tax_number) {
    pdf.text(`HST/GST: ${sanitizePdfText(companySettings.tax_number)}`, pageWidth / 2, footerY, { align: 'center' });
  }
};

// Info page (page 2)
const generateInfoPage = (
  pdf: jsPDF,
  options: PdfGeneratorOptions,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number,
  primaryRgb: { r: number; g: number; b: number },
  secondaryRgb: { r: number; g: number; b: number },
  docNumber: string
) => {
  const { document, companySettings, clientContact } = options;
  
  // Header bar with accent
  pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  pdf.rect(0, 0, 8, 40, 'F');
  
  // Company name in header
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  pdf.text(sanitizePdfText(companySettings?.company_name || 'Company'), 15, 18);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Enterprise Technology Solutions', 15, 26);
  
  // Document number
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(docNumber, pageWidth - margin, 18, { align: 'right' });
  
  // Separator line
  pdf.setDrawColor(229, 231, 235);
  pdf.line(margin, 45, pageWidth - margin, 45);
  
  // Document type badge
  pdf.setFillColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
  const typeBadgeText = (documentTypeLabels[document.document_type] || 'Document').toUpperCase();
  const typeBadgeWidth = pdf.getTextWidth(typeBadgeText) * 0.35 + 20;
  pdf.roundedRect(margin, 55, typeBadgeWidth, 12, 3, 3, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text(typeBadgeText, margin + typeBadgeWidth / 2, 63, { align: 'center' });
  
  // Document title
  pdf.setFontSize(26);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  const mainTitle = pdf.splitTextToSize(sanitizePdfText(document.title), contentWidth);
  pdf.text(mainTitle, margin, 90);
  
  // Service type
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
  pdf.text(sanitizePdfText(serviceTypeLabels[document.service_type] || document.service_type), margin, 105);
  
  // Client section
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(margin, 120, contentWidth, 70, 4, 4, 'F');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(107, 114, 128);
  pdf.text('PREPARED FOR', margin + 15, 138);
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(sanitizePdfText(document.clients?.company_name || 'Client'), margin + 15, 152);
  
  if (clientContact?.full_name) {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    pdf.text(sanitizePdfText(clientContact.full_name), margin + 15, 164);
    if (clientContact.job_title) {
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text(sanitizePdfText(clientContact.job_title), margin + 15, 172);
    }
  }
  
  // Client address
  const clientFullAddress = [
    document.clients?.address_line1,
    [document.clients?.city, document.clients?.province, document.clients?.postal_code].filter(Boolean).join(', ')
  ].filter(Boolean).join('\n');
  
  if (clientFullAddress) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    const addressLines = clientFullAddress.split('\n');
    let addrY = clientContact?.full_name ? 182 : 164;
    addressLines.forEach(line => {
      pdf.text(sanitizePdfText(line), margin + 15, addrY);
      addrY += 6;
    });
  }
  
  // Date boxes
  const dateBoxY = 205;
  const dateBoxWidth = (contentWidth - 10) / 2;
  
  // Date Issued box
  pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  pdf.roundedRect(margin, dateBoxY, dateBoxWidth, 35, 4, 4, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('DATE ISSUED', margin + 10, dateBoxY + 14);
  pdf.setFontSize(14);
  pdf.text(format(new Date(document.created_at), 'MMMM d, yyyy'), margin + 10, dateBoxY + 26);
  
  // Valid Until box
  pdf.setFillColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
  pdf.roundedRect(margin + dateBoxWidth + 10, dateBoxY, dateBoxWidth, 35, 4, 4, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('VALID UNTIL', margin + dateBoxWidth + 20, dateBoxY + 14);
  pdf.setFontSize(14);
  const validUntil = document.expires_at 
    ? format(new Date(document.expires_at), 'MMMM d, yyyy') 
    : 'No expiration';
  pdf.text(validUntil, margin + dateBoxWidth + 20, dateBoxY + 26);
  
  // Footer
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(156, 163, 175);
  pdf.text(sanitizePdfText(`${companySettings?.company_name || 'Company'} - ${docNumber}`), margin, pageHeight - 15);
  pdf.text('Page 2', pageWidth - margin, pageHeight - 15, { align: 'right' });
};

// Table of Contents page
const generateTocPage = (
  pdf: jsPDF,
  options: PdfGeneratorOptions,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number,
  primaryRgb: { r: number; g: number; b: number },
  docNumber: string
) => {
  const { sections, pricingItems, signatures, companySettings } = options;
  
  // Header
  pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  pdf.rect(0, 0, pageWidth, 30, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('TABLE OF CONTENTS', margin, 20);
  
  // TOC entries
  let tocY = 50;
  let pageNumber = 4;
  
  sections.forEach((section, idx) => {
    const sectionTitle = sanitizePdfText(section.title || `Section ${idx + 1}`);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(31, 41, 55);
    
    pdf.text(`${idx + 1}.`, margin, tocY);
    pdf.text(sectionTitle, margin + 10, tocY);
    
    // Dotted line
    pdf.setFillColor(200, 200, 200);
    const titleWidth = pdf.getTextWidth(sectionTitle);
    const dotsStart = margin + 15 + titleWidth;
    const dotsEnd = pageWidth - margin - 15;
    for (let x = dotsStart; x < dotsEnd; x += 3) {
      pdf.circle(x, tocY - 1, 0.3, 'F');
    }
    
    pdf.text(pageNumber.toString(), pageWidth - margin, tocY, { align: 'right' });
    
    tocY += 12;
    pageNumber++;
  });
  
  // Add pricing and signatures to TOC
  tocY += 5;
  if (pricingItems.length > 0) {
    pdf.text(`${sections.length + 1}.`, margin, tocY);
    pdf.text('Pricing & Investment', margin + 10, tocY);
    pdf.text(pageNumber.toString(), pageWidth - margin, tocY, { align: 'right' });
    tocY += 12;
    pageNumber++;
  }
  
  if (signatures && signatures.length > 0) {
    pdf.text(`${sections.length + (pricingItems.length > 0 ? 2 : 1)}.`, margin, tocY);
    pdf.text('Signatures', margin + 10, tocY);
    pdf.text(pageNumber.toString(), pageWidth - margin, tocY, { align: 'right' });
  }
  
  // Footer
  pdf.setFontSize(9);
  pdf.setTextColor(156, 163, 175);
  pdf.text(sanitizePdfText(`${companySettings?.company_name || 'Company'} - ${docNumber}`), margin, pageHeight - 15);
  pdf.text('Page 3', pageWidth - margin, pageHeight - 15, { align: 'right' });
};

// Pricing page
const generatePricingPage = (
  pdf: jsPDF,
  options: PdfGeneratorOptions,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number,
  primaryRgb: { r: number; g: number; b: number },
  currentPage: number
) => {
  const { document, pricingData, pricingItems, companySettings } = options;
  
  // Header
  pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  pdf.rect(0, 0, pageWidth, 30, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('PRICING & INVESTMENT', margin, 20);
  
  let tableY = 50;
  
  // Table header
  pdf.setFillColor(243, 244, 246);
  pdf.rect(margin, tableY, contentWidth, 12, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('Item', margin + 5, tableY + 8);
  pdf.text('Description', margin + 55, tableY + 8);
  pdf.text('Qty', margin + 115, tableY + 8);
  pdf.text('Unit Price', margin + 130, tableY + 8);
  pdf.text('Total', pageWidth - margin - 5, tableY + 8, { align: 'right' });
  
  tableY += 16;
  
  // Table rows
  pricingItems.forEach((item, idx) => {
    if (idx % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, tableY - 4, contentWidth, 14, 'F');
    }
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(31, 41, 55);
    
    const itemName = sanitizePdfText(item.name || 'Item');
    const truncatedName = itemName.length > 20 ? itemName.slice(0, 18) + '..' : itemName;
    pdf.text(truncatedName, margin + 5, tableY + 4);
    
    const desc = sanitizePdfText(item.description || '');
    const truncatedDesc = desc.length > 25 ? desc.slice(0, 23) + '..' : desc;
    pdf.setTextColor(107, 114, 128);
    pdf.text(truncatedDesc, margin + 55, tableY + 4);
    
    pdf.setTextColor(31, 41, 55);
    pdf.text(item.quantity.toString(), margin + 115, tableY + 4);
    pdf.text(formatCurrency(item.unitPrice), margin + 130, tableY + 4);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(item.quantity * item.unitPrice), pageWidth - margin - 5, tableY + 4, { align: 'right' });
    
    tableY += 14;
  });
  
  // Totals section
  tableY += 10;
  pdf.setDrawColor(229, 231, 235);
  pdf.line(margin + 100, tableY, pageWidth - margin, tableY);
  tableY += 10;
  
  // Subtotal
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Subtotal', margin + 130, tableY);
  pdf.setTextColor(31, 41, 55);
  pdf.text(formatCurrency(pricingData.subtotal || 0), pageWidth - margin - 5, tableY, { align: 'right' });
  tableY += 10;
  
  // Discount
  if (pricingData.discountAmount && pricingData.discountAmount > 0) {
    pdf.setTextColor(22, 163, 74);
    pdf.text(`Discount (${pricingData.discountPercent || 0}%)`, margin + 130, tableY);
    pdf.text('-' + formatCurrency(pricingData.discountAmount), pageWidth - margin - 5, tableY, { align: 'right' });
    tableY += 10;
  }
  
  // Total
  tableY += 5;
  pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  pdf.roundedRect(margin + 100, tableY - 5, contentWidth - 100, 18, 3, 3, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('Total Investment', margin + 110, tableY + 6);
  pdf.setFontSize(14);
  pdf.text(formatCurrency(pricingData.total || 0), pageWidth - margin - 10, tableY + 6, { align: 'right' });
  
  // Footer
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(156, 163, 175);
  pdf.text(sanitizePdfText(`${document.title} - ${companySettings?.company_name || 'Company'}`), margin, pageHeight - 15);
  pdf.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
};

// Signature page with actual signature images
const generateSignaturePage = async (
  pdf: jsPDF,
  options: PdfGeneratorOptions,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number,
  primaryRgb: { r: number; g: number; b: number },
  currentPage: number
) => {
  const { document, signatures, companySettings } = options;
  
  // Header
  pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  pdf.rect(0, 0, pageWidth, 30, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('SIGNATURES', margin, 20);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('By signing below, the parties agree to the terms and conditions outlined in this document.', margin, 45);
  
  let sigY = 60;
  const sigBoxHeight = 70; // Increased height for signature image
  
  for (const sig of signatures) {
    // Signature box
    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(margin, sigY, contentWidth, sigBoxHeight, 4, 4, 'F');
    
    // Left side: Signer info
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(107, 114, 128);
    pdf.text(sanitizePdfText(sig.signer_role.toUpperCase()), margin + 10, sigY + 12);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text(sanitizePdfText(sig.signer_name), margin + 10, sigY + 24);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text(sanitizePdfText(sig.signer_email), margin + 10, sigY + 34);
    
    // Right side: Signature image or pending status
    const sigImageX = margin + contentWidth / 2 + 10;
    const sigImageWidth = contentWidth / 2 - 30;
    const sigImageHeight = 30;
    
    if (sig.signed_at && sig.signature_data) {
      // Draw "SIGNED" status
      pdf.setFillColor(22, 163, 74);
      pdf.circle(pageWidth - margin - 25, sigY + 14, 6, 'F');
      drawCheckmark(pdf, pageWidth - margin - 25, sigY + 14, 3);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(22, 163, 74);
      pdf.text('SIGNED', pageWidth - margin - 15, sigY + 16, { align: 'left' });
      
      // Draw signature image
      try {
        pdf.addImage(
          sig.signature_data,
          'PNG',
          sigImageX,
          sigY + 25,
          sigImageWidth,
          sigImageHeight,
          undefined,
          'FAST'
        );
      } catch (e) {
        // If image fails, draw placeholder
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.5);
        pdf.rect(sigImageX, sigY + 25, sigImageWidth, sigImageHeight);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('[Signature on file]', sigImageX + sigImageWidth / 2, sigY + 40, { align: 'center' });
      }
      
      // Signature metadata
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Signed: ${format(new Date(sig.signed_at), 'MMM d, yyyy h:mm a')}`, margin + 10, sigY + 50);
      
      if (sig.ip_address) {
        pdf.text(`IP: ${sanitizePdfText(String(sig.ip_address))}`, margin + 10, sigY + 58);
      }
      
      if (sig.location_data?.city || sig.location_data?.country) {
        const location = [sig.location_data?.city, sig.location_data?.country].filter(Boolean).join(', ');
        pdf.text(`Location: ${sanitizePdfText(location)}`, margin + 10, sigY + 66);
      }
    } else {
      // Pending badge
      pdf.setFillColor(251, 191, 36);
      pdf.circle(pageWidth - margin - 25, sigY + 14, 6, 'F');
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('...', pageWidth - margin - 28, sigY + 16);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(251, 191, 36);
      pdf.text('PENDING', pageWidth - margin - 15, sigY + 16, { align: 'left' });
      
      // Draw signature line placeholder
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(sigImageX, sigY + 50, sigImageX + sigImageWidth, sigY + 50);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Signature', sigImageX + sigImageWidth / 2, sigY + 58, { align: 'center' });
    }
    
    sigY += sigBoxHeight + 10;
  }
  
  // Footer
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(156, 163, 175);
  pdf.text(sanitizePdfText(`${document.title} - ${companySettings?.company_name || 'Company'}`), margin, pageHeight - 15);
  pdf.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
};

// Audit trail page
const generateAuditPage = (
  pdf: jsPDF,
  options: PdfGeneratorOptions,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number,
  primaryRgb: { r: number; g: number; b: number },
  docNumber: string,
  currentPage: number
) => {
  const { document, companySettings } = options;
  
  // Header
  pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  pdf.rect(0, 0, pageWidth, 30, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('DOCUMENT AUDIT SUMMARY', margin, 20);
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text('Document Information', margin, 50);
  
  const auditData = [
    ['Document ID', docNumber],
    ['Type', documentTypeLabels[document.document_type] || document.document_type],
    ['Status', document.status.toUpperCase()],
    ['Created', format(new Date(document.created_at), 'MMMM d, yyyy h:mm a')],
    ['Last Modified', format(new Date(document.updated_at), 'MMMM d, yyyy h:mm a')],
    ['Version', `v${document.version}`],
    ['Compliance Confirmed', document.compliance_confirmed ? 'Yes' : 'No']
  ];
  
  let auditY = 60;
  auditData.forEach(([label, value]) => {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text(sanitizePdfText(label) + ':', margin, auditY);
    pdf.setTextColor(31, 41, 55);
    pdf.text(sanitizePdfText(value || ''), margin + 50, auditY);
    auditY += 10;
  });
  
  // Company footer
  pdf.setFillColor(243, 244, 246);
  pdf.rect(0, pageHeight - 35, pageWidth, 35, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text(sanitizePdfText(`This document was generated by ${companySettings?.company_name || 'Company'}`), pageWidth / 2, pageHeight - 22, { align: 'center' });
  pdf.text(`Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, pageWidth / 2, pageHeight - 14, { align: 'center' });
};
