import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { PdfGeneratorOptions, documentTypeLabels, documentTypePrefixes, serviceTypeLabels } from './types';
import { sanitizePdfText, renderRichText, formatCurrency, drawCheckmark } from './text';

/**
 * Generates a monochrome minimalist PDF for export/download
 */
export const generateExportPdf = async (options: PdfGeneratorOptions): Promise<jsPDF> => {
  const { document, sections, pricingData, pricingItems, signatures, companySettings, clientContact } = options;
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  const docNumber = generateDocumentNumber(document);
  
  // ===== PAGE 1: MINIMAL COVER =====
  // Company name
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(sanitizePdfText(companySettings?.company_name || 'Company'), margin, 40);
  
  // Thin separator
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.5);
  pdf.line(margin, 50, pageWidth - margin, 50);
  
  // Document type
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text((documentTypeLabels[document.document_type] || 'Document').toUpperCase(), margin, 65);
  
  // Document title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  const titleLines = pdf.splitTextToSize(sanitizePdfText(document.title), contentWidth);
  pdf.text(titleLines, margin, 80);
  
  // Client info
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Prepared for:', margin, 110);
  pdf.setFontSize(14);
  pdf.setTextColor(31, 41, 55);
  pdf.text(sanitizePdfText(document.clients?.company_name || 'Client'), margin, 120);
  
  // Dates
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Date: ${format(new Date(document.created_at), 'MMMM d, yyyy')}`, margin, 140);
  if (document.expires_at) {
    pdf.text(`Valid until: ${format(new Date(document.expires_at), 'MMMM d, yyyy')}`, margin, 150);
  }
  
  // Document number
  pdf.text(`Reference: ${docNumber}`, margin, 165);
  
  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  const footerInfo = [companySettings?.address_line1, companySettings?.city, companySettings?.phone, companySettings?.email].filter(Boolean).join(' | ');
  pdf.text(sanitizePdfText(footerInfo), pageWidth / 2, pageHeight - 15, { align: 'center' });
  
  // ===== CONTENT PAGES =====
  let currentPage = 2;
  sections.forEach((section, idx) => {
    pdf.addPage();
    
    // Simple header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text(sanitizePdfText(`${idx + 1}. ${section.title}`), margin, 25);
    
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(margin, 30, pageWidth - margin, 30);
    
    const addPageHeader = (p: jsPDF) => {
      p.setFontSize(10);
      p.setFont('helvetica', 'normal');
      p.setTextColor(150, 150, 150);
      p.text(sanitizePdfText(`${section.title} (continued)`), margin, 15);
      p.setDrawColor(200, 200, 200);
      p.line(margin, 20, pageWidth - margin, 20);
    };
    
    renderRichText(pdf, section.content || '', {
      startX: margin,
      startY: 40,
      maxWidth: contentWidth,
      pageHeight,
      margin,
      primaryColor: '#374151',
      addPageHeader,
      isMonochrome: true,
    });
    
    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(docNumber, margin, pageHeight - 10);
    pdf.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    currentPage++;
  });
  
  // ===== PRICING PAGE =====
  if (pricingItems.length > 0) {
    pdf.addPage();
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text('Pricing Summary', margin, 25);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, 30, pageWidth - margin, 30);
    
    let tableY = 45;
    
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
    
    // Total
    tableY += 5;
    pdf.setDrawColor(100, 100, 100);
    pdf.line(margin + 100, tableY, pageWidth - margin, tableY);
    tableY += 10;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total:', margin + 100, tableY);
    pdf.text(formatCurrency(pricingData.total || 0), pageWidth - margin - 3, tableY, { align: 'right' });
    
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(docNumber, margin, pageHeight - 10);
    pdf.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    currentPage++;
  }
  
  // ===== SIGNATURE PAGE =====
  if (signatures && signatures.length > 0) {
    pdf.addPage();
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text('Signatures', margin, 25);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, 30, pageWidth - margin, 30);
    
    let sigY = 45;
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
    
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(docNumber, margin, pageHeight - 10);
    pdf.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }
  
  return pdf;
};

const generateDocumentNumber = (document: PdfGeneratorOptions['document']): string => {
  const prefix = documentTypePrefixes[document.document_type] || 'DOC';
  const year = new Date(document.created_at).getFullYear();
  const idSuffix = document.id.slice(-3).toUpperCase();
  return `${prefix}-${year}-${idSuffix || '001'}`;
};
