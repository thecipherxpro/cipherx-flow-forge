import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SignatureCanvas, SignatureCanvasRef } from '@/components/SignatureCanvas';
import { 
  ArrowLeft, 
  Download, 
  Send, 
  Edit, 
  Loader2,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Shield,
  PenTool,
  Clock,
  Link2,
  Copy,
  CheckCircle2,
  Lock,
  MapPin,
  Globe,
  User,
  Mail,
  Briefcase,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

interface DocumentSection {
  key: string;
  title: string;
  content: string;
  isRequired: boolean;
}

interface PricingItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Signature {
  id: string;
  signer_name: string;
  signer_email: string;
  signer_role: string;
  signed_at: string | null;
  is_required: boolean;
  signature_data: string | null;
  ip_address: string | null;
  location_data: {
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  } | null;
  user_agent: string | null;
}

interface CompanySettings {
  company_name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  footer_text: string | null;
  tax_number: string | null;
}

interface ClientContact {
  full_name: string;
  email: string;
  job_title: string | null;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
  signed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  cancelled: 'bg-muted text-muted-foreground'
};

const documentTypeLabels: Record<string, string> = {
  proposal: 'Proposal',
  contract: 'Contract',
  sla: 'Service Level Agreement'
};

const documentTypePrefixes: Record<string, string> = {
  proposal: 'PROP',
  contract: 'CONT',
  sla: 'SLA'
};

const serviceTypeLabels: Record<string, string> = {
  website_pwa_build: 'Website & PWA Build',
  website_only: 'Website Only',
  pwa_only: 'PWA Only',
  cybersecurity: 'Cybersecurity',
  graphic_design: 'Graphic Design'
};

const DocumentView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);
  const signatureCanvasRef = useRef<SignatureCanvasRef>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [signatureSheetOpen, setSignatureSheetOpen] = useState(false);
  const [selectedSigner, setSelectedSigner] = useState<Signature | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const { data: document, isLoading: docLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*, clients(company_name, address_line1, address_line2, city, province, postal_code, country, phone)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: clientContact } = useQuery({
    queryKey: ['client-contact', document?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_contacts')
        .select('full_name, email, job_title')
        .eq('client_id', document?.client_id)
        .eq('is_primary', true)
        .single();
      if (error) return null;
      return data as ClientContact;
    },
    enabled: !!document?.client_id
  });

  const { data: signatures, refetch: refetchSignatures } = useQuery({
    queryKey: ['signatures', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .eq('document_id', id)
        .order('sort_order');
      if (error) throw error;
      return data as Signature[];
    },
    enabled: !!id
  });

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data as CompanySettings;
    }
  });

  const rawSections = (document?.content as any)?.sections;
  const sections: DocumentSection[] = Array.isArray(rawSections)
    ? rawSections.map((s: any, idx: number) => ({
        key: String(s?.key ?? `section_${idx + 1}`),
        title: String(s?.title ?? s?.section_title ?? `Section ${idx + 1}`),
        content:
          typeof s?.content === 'string'
            ? s.content
            : s?.content == null
              ? ''
              : JSON.stringify(s.content, null, 2),
        isRequired: Boolean(s?.isRequired ?? s?.is_required ?? false),
      }))
    : [];

  const pricingData = (document?.pricing_data as any) ?? {};
  const rawPricingItems = pricingData?.items;
  const pricingItems: PricingItem[] = Array.isArray(rawPricingItems)
    ? rawPricingItems.map((it: any, idx: number) => ({
        id: String(it?.id ?? `item_${idx + 1}`),
        name: String(it?.name ?? 'Item'),
        description: typeof it?.description === 'string' ? it.description : '',
        quantity: Number(it?.quantity ?? 1),
        unitPrice: Number(it?.unitPrice ?? it?.unit_price ?? 0),
      }))
    : [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
  };

  const handleOpenSignatureSheet = (sig: Signature) => {
    setSelectedSigner(sig);
    setSignatureSheetOpen(true);
  };

  const handleCaptureSignature = async () => {
    if (!selectedSigner || !signatureCanvasRef.current) return;
    
    const signatureData = signatureCanvasRef.current.getSignatureData();
    if (!signatureData) {
      toast({ variant: 'destructive', title: 'Please draw a signature first' });
      return;
    }

    setIsSigning(true);
    try {
      // Get IP address
      let ipAddress = '0.0.0.0';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;
      } catch (e) {
        console.log('Could not fetch IP');
      }

      // Update signature record
      const { error: sigError } = await supabase
        .from('signatures')
        .update({
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
          ip_address: ipAddress,
          user_agent: navigator.userAgent,
          location_data: { admin_signed: true }
        })
        .eq('id', selectedSigner.id);

      if (sigError) throw sigError;

      // Log audit entry
      await supabase.from('document_audit_log').insert({
        document_id: id,
        action: 'admin_signature_captured',
        details: {
          signer_name: selectedSigner.signer_name,
          signer_email: selectedSigner.signer_email,
          signer_role: selectedSigner.signer_role
        },
        ip_address: ipAddress
      });

      // Check if all signatures complete
      const { data: allSigs } = await supabase
        .from('signatures')
        .select('signed_at')
        .eq('document_id', id);

      const allSigned = allSigs?.every(s => s.signed_at !== null);
      if (allSigned) {
        await supabase
          .from('documents')
          .update({ status: 'signed' })
          .eq('id', id);
        
        queryClient.invalidateQueries({ queryKey: ['document', id] });
      }

      await refetchSignatures();
      setSignatureSheetOpen(false);
      setSelectedSigner(null);
      toast({ title: 'Signature captured successfully' });
    } catch (error) {
      console.error('Error capturing signature:', error);
      toast({ variant: 'destructive', title: 'Failed to capture signature' });
    } finally {
      setIsSigning(false);
    }
  };

  // Helper to convert hex color to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 15, g: 23, b: 42 };
  };

  // Generate document number
  const generateDocumentNumber = () => {
    const prefix = documentTypePrefixes[document?.document_type || 'contract'] || 'DOC';
    const year = new Date(document?.created_at || new Date()).getFullYear();
    const idSuffix = (document?.id || '').slice(-3).toUpperCase();
    return `${prefix}-${year}-${idSuffix || '001'}`;
  };

  // Parse rich text and render to PDF
  const parseRichText = (
    pdf: jsPDF,
    content: string,
    startX: number,
    startY: number,
    maxWidth: number,
    pageHeight: number,
    margin: number,
    primaryColor: string,
    addPageHeader: (p: jsPDF) => void
  ): number => {
    const primaryRgb = hexToRgb(primaryColor);
    let yPos = startY;
    const lineHeight = 6;
    const paragraphSpacing = 10;
    
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Check for page break
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        addPageHeader(pdf);
        yPos = 45;
      }

      // Headers
      if (line.startsWith('### ')) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        pdf.text(line.replace('### ', ''), startX, yPos);
        yPos += lineHeight + 4;
        continue;
      }
      if (line.startsWith('## ')) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        pdf.text(line.replace('## ', ''), startX, yPos);
        yPos += lineHeight + 6;
        continue;
      }
      if (line.startsWith('# ')) {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        pdf.text(line.replace('# ', ''), startX, yPos);
        yPos += lineHeight + 8;
        continue;
      }

      // Horizontal rule
      if (line.trim() === '---' || line.trim() === '***') {
        pdf.setDrawColor(200, 200, 200);
        pdf.line(startX, yPos, startX + maxWidth, yPos);
        yPos += 8;
        continue;
      }

      // Bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(31, 41, 55);
        const bulletText = line.replace(/^[\s]*[-*]\s/, '');
        const wrappedText = pdf.splitTextToSize(bulletText, maxWidth - 10);
        
        pdf.text('•', startX, yPos);
        wrappedText.forEach((textLine: string, idx: number) => {
          if (yPos > pageHeight - 40) {
            pdf.addPage();
            addPageHeader(pdf);
            yPos = 45;
          }
          pdf.text(textLine, startX + 6, yPos);
          yPos += lineHeight;
        });
        continue;
      }

      // Numbered list
      const numberedMatch = line.trim().match(/^(\d+)\.\s(.+)/);
      if (numberedMatch) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(31, 41, 55);
        const numText = numberedMatch[2];
        const wrappedText = pdf.splitTextToSize(numText, maxWidth - 12);
        
        pdf.text(`${numberedMatch[1]}.`, startX, yPos);
        wrappedText.forEach((textLine: string, idx: number) => {
          if (yPos > pageHeight - 40) {
            pdf.addPage();
            addPageHeader(pdf);
            yPos = 45;
          }
          pdf.text(textLine, startX + 8, yPos);
          yPos += lineHeight;
        });
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        yPos += paragraphSpacing / 2;
        continue;
      }

      // Regular paragraph with bold/italic support
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(31, 41, 55);

      // Handle bold text
      let processedLine = line;
      if (processedLine.includes('**')) {
        // Simple approach: render without markdown symbols
        processedLine = processedLine.replace(/\*\*(.+?)\*\*/g, '$1');
      }
      if (processedLine.includes('*')) {
        processedLine = processedLine.replace(/\*(.+?)\*/g, '$1');
      }

      const wrappedLines = pdf.splitTextToSize(processedLine, maxWidth);
      wrappedLines.forEach((textLine: string) => {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          addPageHeader(pdf);
          yPos = 45;
        }
        pdf.text(textLine, startX, yPos);
        yPos += lineHeight;
      });
    }

    return yPos;
  };

  const handleExportPDF = async () => {
    if (!document) return;
    
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      const primaryColor = companySettings?.primary_color || '#6B21A8';
      const secondaryColor = companySettings?.secondary_color || '#A855F7';
      const primaryRgb = hexToRgb(primaryColor);
      const secondaryRgb = hexToRgb(secondaryColor);

      // ===== PAGE 1: COVER PAGE =====
      // Full page gradient background
      pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Company logo placeholder circle
      pdf.setFillColor(255, 255, 255);
      pdf.circle(pageWidth / 2, 50, 20, 'F');
      
      // Company initials in circle
      const initials = (companySettings?.company_name || 'CX').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.text(initials, pageWidth / 2, 55, { align: 'center' });

      // Company name
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text(companySettings?.company_name || 'Company Name', pageWidth / 2, 90, { align: 'center' });

      // Tagline
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Enterprise Technology Solutions', pageWidth / 2, 100, { align: 'center' });

      // White content area
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, 120, contentWidth, 110, 5, 5, 'F');

      // Document type badge
      const docTypeText = documentTypeLabels[document.document_type]?.toUpperCase() || 'DOCUMENT';
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
      const titleLines = pdf.splitTextToSize(document.title, contentWidth - 30);
      pdf.text(titleLines, margin + 15, 160);

      // Prepared for section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('PREPARED FOR', margin + 15, 185);

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      pdf.text(document.clients?.company_name || 'Client', margin + 15, 195);

      // Date section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('DATE: ' + format(new Date(document.created_at), 'MMMM d, yyyy'), margin + 15, 210);

      if (document.expires_at) {
        pdf.text('VALID UNTIL: ' + format(new Date(document.expires_at), 'MMMM d, yyyy'), margin + 15, 218);
      }

      // Footer section on cover
      pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.rect(0, pageHeight - 45, pageWidth, 45, 'F');

      // Company contact info in footer
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
        ].filter(Boolean).join(' • ');
        pdf.text(fullAddress, pageWidth / 2, footerY, { align: 'center' });
        footerY += 7;
      }
      
      const contactLine = [
        companySettings?.phone,
        companySettings?.email,
        companySettings?.website
      ].filter(Boolean).join(' • ');
      if (contactLine) {
        pdf.text(contactLine, pageWidth / 2, footerY, { align: 'center' });
        footerY += 7;
      }

      if (companySettings?.tax_number) {
        pdf.text(`HST/GST: ${companySettings.tax_number}`, pageWidth / 2, footerY, { align: 'center' });
      }

      // ===== PAGE 2: DOCUMENT INFO PAGE (Matching reference image) =====
      pdf.addPage();

      // Header bar with purple accent
      pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.rect(0, 0, 8, 40, 'F');
      
      // Company name in header
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.text(companySettings?.company_name || 'Company', 15, 18);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('Enterprise Technology Solutions', 15, 26);

      // Document number (top right)
      const docNumber = generateDocumentNumber();
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

      // Document title (large)
      pdf.setFontSize(26);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      const mainTitle = pdf.splitTextToSize(document.title, contentWidth);
      pdf.text(mainTitle, margin, 90);

      // Service type
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
      pdf.text(serviceTypeLabels[document.service_type] || document.service_type, margin, 105);

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
      pdf.text(document.clients?.company_name || 'Client', margin + 15, 152);

      // Contact person
      if (clientContact?.full_name) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(55, 65, 81);
        pdf.text(clientContact.full_name, margin + 15, 164);
        if (clientContact.job_title) {
          pdf.setFontSize(10);
          pdf.setTextColor(107, 114, 128);
          pdf.text(clientContact.job_title, margin + 15, 172);
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
          pdf.text(line, margin + 15, addrY);
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

      // Footer on page 2
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(156, 163, 175);
      pdf.text(`${companySettings?.company_name || 'Company'} • ${docNumber}`, margin, pageHeight - 15);
      pdf.text('Page 2', pageWidth - margin, pageHeight - 15, { align: 'right' });

      // ===== PAGE 3: TABLE OF CONTENTS =====
      pdf.addPage();
      
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
      const tocSections = [...sections];

      tocSections.forEach((section, idx) => {
        const sectionTitle = String(section?.title ?? `Section ${idx + 1}`);

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(31, 41, 55);

        // Section number and title
        pdf.text(`${idx + 1}.`, margin, tocY);
        pdf.text(sectionTitle, margin + 10, tocY);

        // Dotted line
        pdf.setDrawColor(200, 200, 200);
        const titleWidth = pdf.getTextWidth(sectionTitle);
        const dotsStart = margin + 15 + titleWidth;
        const dotsEnd = pageWidth - margin - 15;
        for (let x = dotsStart; x < dotsEnd; x += 3) {
          pdf.circle(x, tocY - 1, 0.3, 'F');
        }

        // Page number
        pdf.text(pageNumber.toString(), pageWidth - margin, tocY, { align: 'right' });

        tocY += 12;
        pageNumber++;
      });

      // Add pricing and signatures to TOC
      tocY += 5;
      if (pricingItems.length > 0) {
        pdf.text(`${tocSections.length + 1}.`, margin, tocY);
        pdf.text('Pricing & Investment', margin + 10, tocY);
        pdf.text(pageNumber.toString(), pageWidth - margin, tocY, { align: 'right' });
        tocY += 12;
        pageNumber++;
      }
      
      if (signatures && signatures.length > 0) {
        pdf.text(`${tocSections.length + (pricingItems.length > 0 ? 2 : 1)}.`, margin, tocY);
        pdf.text('Signatures', margin + 10, tocY);
        pdf.text(pageNumber.toString(), pageWidth - margin, tocY, { align: 'right' });
      }

      // Footer
      pdf.setFontSize(9);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`${companySettings?.company_name || 'Company'} • ${docNumber}`, margin, pageHeight - 15);
      pdf.text('Page 3', pageWidth - margin, pageHeight - 15, { align: 'right' });

      // Helper for page headers
      const addSectionHeader = (p: jsPDF, title: string, sectionNum: number) => {
        p.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        p.rect(0, 0, pageWidth, 30, 'F');
        p.setFontSize(10);
        p.setFont('helvetica', 'normal');
        p.setTextColor(255, 255, 255);
        p.text(`Section ${sectionNum}`, margin, 14);
        p.setFontSize(12);
        p.setFont('helvetica', 'bold');
        p.text(title, margin, 23);
      };

      // ===== CONTENT PAGES =====
      let currentPage = 4;
      sections.forEach((section, idx) => {
        pdf.addPage();
        addSectionHeader(pdf, section.title, idx + 1);
        
        // Section content with rich text parsing
        const addPageHeaderFn = (p: jsPDF) => {
          addSectionHeader(p, section.title + ' (continued)', idx + 1);
        };

        parseRichText(
          pdf,
          section.content || '',
          margin,
          45,
          contentWidth,
          pageHeight,
          margin,
          primaryColor,
          addPageHeaderFn
        );

        // Footer
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(156, 163, 175);
        pdf.text(`${document.title} • ${companySettings?.company_name || 'Company'}`, margin, pageHeight - 15);
        pdf.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
        currentPage++;
      });

      // ===== PRICING PAGE =====
      if (pricingItems.length > 0) {
        pdf.addPage();
        
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
          
          const itemNameRaw = String((item as any)?.name ?? '');
          const itemName = itemNameRaw.length > 20 ? itemNameRaw.slice(0, 18) + '...' : itemNameRaw;
          pdf.text(itemName || 'Item', margin + 5, tableY + 4);
          
          const descRaw = String((item as any)?.description ?? '');
          const desc = descRaw.length > 25 ? descRaw.slice(0, 23) + '...' : descRaw;
          pdf.setTextColor(107, 114, 128);
          pdf.text(desc, margin + 55, tableY + 4);
          
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
        if (pricingData.discountAmount > 0) {
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
        pdf.text(`${document.title} • ${companySettings?.company_name || 'Company'}`, margin, pageHeight - 15);
        pdf.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
        currentPage++;
      }

      // ===== SIGNATURE PAGE =====
      if (signatures && signatures.length > 0) {
        pdf.addPage();
        
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
        signatures.forEach((sig) => {
          // Signature box
          pdf.setFillColor(249, 250, 251);
          pdf.roundedRect(margin, sigY, contentWidth, 50, 4, 4, 'F');
          
          // Signer info
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(107, 114, 128);
          pdf.text(sig.signer_role.toUpperCase(), margin + 10, sigY + 12);
          
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(31, 41, 55);
          pdf.text(sig.signer_name, margin + 10, sigY + 24);
          
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(107, 114, 128);
          pdf.text(sig.signer_email, margin + 10, sigY + 34);

          // Signature status
          if (sig.signed_at) {
            // Signed checkmark
            pdf.setFillColor(22, 163, 74);
            pdf.circle(pageWidth - margin - 25, sigY + 18, 6, 'F');
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 255, 255);
            pdf.text('✓', pageWidth - margin - 27.5, sigY + 21);
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(22, 163, 74);
            pdf.text('SIGNED', pageWidth - margin - 15, sigY + 20, { align: 'left' });
            
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(107, 114, 128);
            pdf.text(format(new Date(sig.signed_at), 'MMM d, yyyy h:mm a'), margin + 10, sigY + 44);
            
            if (sig.ip_address) {
              pdf.text(`IP: ${sig.ip_address}`, margin + 80, sigY + 44);
            }
          } else {
            // Pending badge
            pdf.setFillColor(251, 191, 36);
            pdf.roundedRect(pageWidth - margin - 50, sigY + 12, 40, 14, 3, 3, 'F');
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 255, 255);
            pdf.text('PENDING', pageWidth - margin - 30, sigY + 21, { align: 'center' });
          }

          sigY += 60;
        });

        // Footer
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(156, 163, 175);
        pdf.text(`${document.title} • ${companySettings?.company_name || 'Company'}`, margin, pageHeight - 15);
        pdf.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
        currentPage++;
      }

      // ===== AUDIT TRAIL PAGE =====
      pdf.addPage();
      
      // Header
      pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.rect(0, 0, pageWidth, 30, 'F');
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('AUDIT TRAIL', margin, 20);

      // Audit info
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
        pdf.text(label + ':', margin, auditY);
        pdf.setTextColor(31, 41, 55);
        pdf.text(value || '', margin + 50, auditY);
        auditY += 10;
      });

      // Company footer
      pdf.setFillColor(243, 244, 246);
      pdf.rect(0, pageHeight - 35, pageWidth, 35, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`This document was generated by ${companySettings?.company_name || 'Company'}`, pageWidth / 2, pageHeight - 22, { align: 'center' });
      pdf.text(`Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, pageWidth / 2, pageHeight - 14, { align: 'center' });

      // Save PDF
      const fileName = `${docNumber}_${document.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      pdf.save(fileName);
      
      toast({ title: 'PDF exported successfully' });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({ variant: 'destructive', title: 'Failed to export PDF' });
    } finally {
      setIsExporting(false);
    }
  };

  // Print function - generates same professional PDF as export but opens for printing
  const handlePrint = async () => {
    if (!document) return;
    
    setIsPrinting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      const primaryColor = companySettings?.primary_color || '#6B21A8';
      const secondaryColor = companySettings?.secondary_color || '#A855F7';
      const primaryRgb = hexToRgb(primaryColor);
      const secondaryRgb = hexToRgb(secondaryColor);

      // ===== PAGE 1: COVER PAGE =====
      pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Company logo placeholder circle
      pdf.setFillColor(255, 255, 255);
      pdf.circle(pageWidth / 2, 50, 20, 'F');
      
      const initials = (companySettings?.company_name || 'CX').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.text(initials, pageWidth / 2, 55, { align: 'center' });

      // Company name
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text(companySettings?.company_name || 'Company Name', pageWidth / 2, 90, { align: 'center' });

      // Tagline
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Enterprise Technology Solutions', pageWidth / 2, 100, { align: 'center' });

      // White content area
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, 120, contentWidth, 110, 5, 5, 'F');

      // Document type badge
      const docTypeText = documentTypeLabels[document.document_type]?.toUpperCase() || 'DOCUMENT';
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
      const titleLines = pdf.splitTextToSize(document.title, contentWidth - 30);
      pdf.text(titleLines, margin + 15, 160);

      // Prepared for section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('PREPARED FOR', margin + 15, 185);

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      pdf.text(document.clients?.company_name || 'Client', margin + 15, 195);

      // Date section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('DATE: ' + format(new Date(document.created_at), 'MMMM d, yyyy'), margin + 15, 210);

      if (document.expires_at) {
        pdf.text('VALID UNTIL: ' + format(new Date(document.expires_at), 'MMMM d, yyyy'), margin + 15, 218);
      }

      // Footer section on cover
      pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.rect(0, pageHeight - 45, pageWidth, 45, 'F');

      // Company contact info in footer
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
        ].filter(Boolean).join(' • ');
        pdf.text(fullAddress, pageWidth / 2, footerY, { align: 'center' });
        footerY += 7;
      }
      
      const contactLine = [
        companySettings?.phone,
        companySettings?.email,
        companySettings?.website
      ].filter(Boolean).join(' • ');
      if (contactLine) {
        pdf.text(contactLine, pageWidth / 2, footerY, { align: 'center' });
        footerY += 7;
      }

      if (companySettings?.tax_number) {
        pdf.text(`HST/GST: ${companySettings.tax_number}`, pageWidth / 2, footerY, { align: 'center' });
      }

      // ===== PAGE 2: DOCUMENT INFO PAGE =====
      pdf.addPage();

      // Header bar with purple accent
      pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.rect(0, 0, 8, 40, 'F');
      
      // Company name in header
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.text(companySettings?.company_name || 'Company', 15, 18);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('Enterprise Technology Solutions', 15, 26);

      // Document number
      const docNumber = generateDocumentNumber();
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
      const mainTitle = pdf.splitTextToSize(document.title, contentWidth);
      pdf.text(mainTitle, margin, 90);

      // Service type
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
      pdf.text(serviceTypeLabels[document.service_type] || document.service_type, margin, 105);

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
      pdf.text(document.clients?.company_name || 'Client', margin + 15, 152);

      // Contact person
      if (clientContact?.full_name) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(55, 65, 81);
        pdf.text(clientContact.full_name, margin + 15, 164);
        if (clientContact.job_title) {
          pdf.setFontSize(10);
          pdf.setTextColor(107, 114, 128);
          pdf.text(clientContact.job_title, margin + 15, 172);
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
          pdf.text(line, margin + 15, addrY);
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

      // Footer on page 2
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(156, 163, 175);
      pdf.text(`${companySettings?.company_name || 'Company'} • ${docNumber}`, margin, pageHeight - 15);
      pdf.text('Page 2', pageWidth - margin, pageHeight - 15, { align: 'right' });

      // ===== PAGE 3: TABLE OF CONTENTS =====
      pdf.addPage();
      
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
      const tocSections = [...sections];

      tocSections.forEach((section, idx) => {
        const sectionTitle = String(section?.title ?? `Section ${idx + 1}`);

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(31, 41, 55);

        pdf.text(`${idx + 1}.`, margin, tocY);
        pdf.text(sectionTitle, margin + 10, tocY);

        pdf.setDrawColor(200, 200, 200);
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
        pdf.text(`${tocSections.length + 1}.`, margin, tocY);
        pdf.text('Pricing & Investment', margin + 10, tocY);
        pdf.text(pageNumber.toString(), pageWidth - margin, tocY, { align: 'right' });
        tocY += 12;
        pageNumber++;
      }
      
      if (signatures && signatures.length > 0) {
        pdf.text(`${tocSections.length + (pricingItems.length > 0 ? 2 : 1)}.`, margin, tocY);
        pdf.text('Signatures', margin + 10, tocY);
        pdf.text(pageNumber.toString(), pageWidth - margin, tocY, { align: 'right' });
      }

      // Footer
      pdf.setFontSize(9);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`${companySettings?.company_name || 'Company'} • ${docNumber}`, margin, pageHeight - 15);
      pdf.text('Page 3', pageWidth - margin, pageHeight - 15, { align: 'right' });

      // Helper for page headers
      const addSectionHeader = (p: jsPDF, title: string, sectionNum: number) => {
        p.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        p.rect(0, 0, pageWidth, 30, 'F');
        p.setFontSize(10);
        p.setFont('helvetica', 'normal');
        p.setTextColor(255, 255, 255);
        p.text(`Section ${sectionNum}`, margin, 14);
        p.setFontSize(12);
        p.setFont('helvetica', 'bold');
        p.text(title, margin, 23);
      };

      // ===== CONTENT PAGES =====
      let currentPage = 4;
      sections.forEach((section, idx) => {
        pdf.addPage();
        addSectionHeader(pdf, section.title, idx + 1);
        
        const addPageHeaderFn = (p: jsPDF) => {
          addSectionHeader(p, section.title + ' (continued)', idx + 1);
        };

        parseRichText(
          pdf,
          section.content || '',
          margin,
          45,
          contentWidth,
          pageHeight,
          margin,
          primaryColor,
          addPageHeaderFn
        );

        // Footer
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(156, 163, 175);
        pdf.text(`${document.title} • ${companySettings?.company_name || 'Company'}`, margin, pageHeight - 15);
        pdf.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
        currentPage++;
      });

      // ===== PRICING PAGE =====
      if (pricingItems.length > 0) {
        pdf.addPage();
        
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
          
          const itemNameRaw = String((item as any)?.name ?? '');
          const itemName = itemNameRaw.length > 20 ? itemNameRaw.slice(0, 18) + '...' : itemNameRaw;
          pdf.text(itemName || 'Item', margin + 5, tableY + 4);
          
          const descRaw = String((item as any)?.description ?? '');
          const desc = descRaw.length > 25 ? descRaw.slice(0, 23) + '...' : descRaw;
          pdf.setTextColor(107, 114, 128);
          pdf.text(desc, margin + 55, tableY + 4);
          
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
        if (pricingData.discountAmount > 0) {
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
        pdf.text(`${document.title} • ${companySettings?.company_name || 'Company'}`, margin, pageHeight - 15);
        pdf.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
        currentPage++;
      }

      // ===== SIGNATURE PAGE =====
      if (signatures && signatures.length > 0) {
        pdf.addPage();
        
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
        signatures.forEach((sig) => {
          pdf.setFillColor(249, 250, 251);
          pdf.roundedRect(margin, sigY, contentWidth, 50, 4, 4, 'F');
          
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(107, 114, 128);
          pdf.text(sig.signer_role.toUpperCase(), margin + 10, sigY + 12);
          
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(31, 41, 55);
          pdf.text(sig.signer_name, margin + 10, sigY + 24);
          
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(107, 114, 128);
          pdf.text(sig.signer_email, margin + 10, sigY + 34);

          if (sig.signed_at) {
            pdf.setFillColor(22, 163, 74);
            pdf.circle(pageWidth - margin - 25, sigY + 18, 6, 'F');
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 255, 255);
            pdf.text('✓', pageWidth - margin - 27.5, sigY + 21);
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(22, 163, 74);
            pdf.text('SIGNED', pageWidth - margin - 15, sigY + 20, { align: 'left' });
            
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(107, 114, 128);
            pdf.text(format(new Date(sig.signed_at), 'MMM d, yyyy h:mm a'), margin + 10, sigY + 44);
            
            if (sig.ip_address) {
              pdf.text(`IP: ${sig.ip_address}`, margin + 80, sigY + 44);
            }
          } else {
            pdf.setFillColor(251, 191, 36);
            pdf.circle(pageWidth - margin - 25, sigY + 18, 6, 'F');
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 255, 255);
            pdf.text('...', pageWidth - margin - 28, sigY + 20);
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(251, 191, 36);
            pdf.text('PENDING', pageWidth - margin - 15, sigY + 20, { align: 'left' });
          }

          sigY += 60;
        });

        // Footer
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(156, 163, 175);
        pdf.text(`${document.title} • ${companySettings?.company_name || 'Company'}`, margin, pageHeight - 15);
        pdf.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
        currentPage++;
      }

      // ===== AUDIT SUMMARY PAGE =====
      pdf.addPage();
      
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
        pdf.text(label + ':', margin, auditY);
        pdf.setTextColor(31, 41, 55);
        pdf.text(value || '', margin + 50, auditY);
        auditY += 10;
      });

      // Company footer
      pdf.setFillColor(243, 244, 246);
      pdf.rect(0, pageHeight - 35, pageWidth, 35, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`This document was generated by ${companySettings?.company_name || 'Company'}`, pageWidth / 2, pageHeight - 22, { align: 'center' });
      pdf.text(`Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, pageWidth / 2, pageHeight - 14, { align: 'center' });

      // Open PDF in new window for printing
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');

      if (!printWindow) {
        toast({
          variant: 'destructive',
          title: 'Pop-up blocked',
          description: 'Allow pop-ups to open the PDF for printing.',
        });
      } else {
        // Some browsers don't fire "load" reliably for blob PDFs, so we also use a timeout.
        const tryPrint = () => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch {
            // ignore
          }
        };
        printWindow.addEventListener('load', tryPrint);
        setTimeout(tryPrint, 700);
      }
      
      toast({ title: 'Print dialog opened' });
    } catch (error) {
      console.error('Error printing document:', error);
      toast({ variant: 'destructive', title: 'Failed to print document' });
    } finally {
      setIsPrinting(false);
    }
  };

  if (docLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Document not found</h2>
        <Button asChild>
          <Link to="/admin/documents">Back to Documents</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Top Row: Back + Title */}
        <div className="flex items-start gap-2 sm:gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/admin/documents')}
            className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 no-print"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight truncate">
              {document.title}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {documentTypeLabels[document.document_type]}
              </Badge>
              <Badge className={`${statusColors[document.status]} text-xs`}>
                {document.status}
              </Badge>
              <span className="text-xs sm:text-sm text-muted-foreground">v{document.version}</span>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 no-print">
          {document.status === 'draft' && (
            <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
              <Link to={`/admin/documents/${id}/edit`}>
                <Edit className="h-4 w-4 mr-1.5" />
                <span className="sm:inline">Edit</span>
              </Link>
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint} 
            disabled={isPrinting}
            className="flex-1 sm:flex-none"
          >
            {isPrinting ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-1.5" />
            )}
            <span>Print</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF} 
            disabled={isExporting}
            className="flex-1 sm:flex-none"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            <span>PDF</span>
          </Button>
          {document.status === 'draft' && (
            <Button size="sm" className="flex-1 sm:flex-none">
              <Send className="h-4 w-4 mr-1.5" />
              <span>Send</span>
            </Button>
          )}
        </div>
      </div>

      {/* Document Preview */}
      <div ref={printRef} id="print-content" className="space-y-3 sm:space-y-4">
        {/* Meta Info Card */}
        <Card>
          <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Client</p>
                  <p className="font-medium text-sm sm:text-base truncate">
                    {document.clients?.company_name}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Service</p>
                  <p className="font-medium text-sm sm:text-base truncate">
                    {serviceTypeLabels[document.service_type]}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Created</p>
                  <p className="font-medium text-sm sm:text-base">
                    {format(new Date(document.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              {document.expires_at && (
                <div className="flex items-start gap-2 sm:gap-3">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Expires</p>
                    <p className="font-medium text-sm sm:text-base">
                      {format(new Date(document.expires_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        {sections.length > 0 && (
          <Card className="print-page-break">
            <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                Document Sections
              </h2>
              <div className="space-y-4 sm:space-y-6">
                {sections.map((section, idx) => (
                  <div key={section.key || idx}>
                    <h3 className="font-medium text-sm sm:text-base mb-1.5 sm:mb-2">
                      {section.title}
                    </h3>
                    <div className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap">
                      {section.content}
                    </div>
                    {idx < sections.length - 1 && <Separator className="mt-4 sm:mt-6" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing */}
        {pricingItems.length > 0 && (
          <Card className="print-page-break">
            <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                Pricing & Investment
              </h2>
              
              {/* Mobile: Card View */}
              <div className="block sm:hidden space-y-3">
                {pricingItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3 bg-muted/20">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="font-semibold text-sm">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </p>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
                    )}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Qty: {item.quantity}</span>
                      <span>@ {formatCurrency(item.unitPrice)}</span>
                    </div>
                  </div>
                ))}
                <Separator className="my-3" />
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(pricingData.subtotal || 0)}</span>
                  </div>
                  {pricingData.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(pricingData.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-1 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(pricingData.total || 0)}</span>
                  </div>
                </div>
              </div>
              
              {/* Desktop: Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Item</th>
                      <th className="text-center py-2 font-medium">Qty</th>
                      <th className="text-right py-2 font-medium">Unit Price</th>
                      <th className="text-right py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricingItems.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-2">
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          )}
                        </td>
                        <td className="text-center py-2">{item.quantity}</td>
                        <td className="text-right py-2">{formatCurrency(item.unitPrice)}</td>
                        <td className="text-right py-2">{formatCurrency(item.quantity * item.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="text-right py-2 font-medium">Subtotal</td>
                      <td className="text-right py-2">{formatCurrency(pricingData.subtotal || 0)}</td>
                    </tr>
                    {pricingData.discountAmount > 0 && (
                      <tr className="text-green-600">
                        <td colSpan={3} className="text-right py-2">Discount</td>
                        <td className="text-right py-2">-{formatCurrency(pricingData.discountAmount)}</td>
                      </tr>
                    )}
                    <tr className="font-bold text-lg">
                      <td colSpan={3} className="text-right py-2">Total</td>
                      <td className="text-right py-2">{formatCurrency(pricingData.total || 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compliance */}
        {document.compliance_confirmed && (
          <Card>
            <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                <div>
                  <p className="font-medium text-sm sm:text-base">Compliance Confirmed</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    This document meets all regulatory and compliance requirements.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signatures */}
        {signatures && signatures.length > 0 && (
          <Card className="print-page-break">
            <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <PenTool className="h-4 w-4 sm:h-5 sm:w-5" />
                  Signatures
                </h2>
                {document.status === 'signed' && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 w-fit text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Document Locked
                  </Badge>
                )}
              </div>
              <div className="space-y-3 sm:space-y-4">
                {signatures.map((sig) => {
                  const signingUrl = `${window.location.origin}/sign/${id}?sig=${sig.id}`;
                  
                  return (
                    <div 
                      key={sig.id} 
                      className={`border rounded-lg p-3 sm:p-4 transition-colors ${
                        !sig.signed_at && document.status !== 'signed' 
                          ? 'hover:bg-muted/50 cursor-pointer' 
                          : ''
                      }`}
                      onClick={() => {
                        if (!sig.signed_at && document.status !== 'signed') {
                          handleOpenSignatureSheet(sig);
                        }
                      }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Briefcase className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs sm:text-sm text-muted-foreground">{sig.signer_role}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <p className="font-medium text-sm sm:text-base">{sig.signer_name}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{sig.signer_email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 no-print">
                          {sig.signed_at ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs whitespace-nowrap">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              <span className="hidden xs:inline">Signed </span>
                              {format(new Date(sig.signed_at), 'MMM d')}
                            </Badge>
                          ) : (
                            <>
                              <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                              {document.status !== 'signed' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenSignatureSheet(sig);
                                  }}
                                >
                                  <PenTool className="h-3 w-3 mr-1" />
                                  Sign
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Show signature image if signed */}
                      {sig.signed_at && sig.signature_data && (
                        <div className="mt-3 p-2 sm:p-3 bg-muted/30 rounded-lg">
                          <img 
                            src={sig.signature_data} 
                            alt={`Signature of ${sig.signer_name}`}
                            className="h-12 sm:h-16 object-contain"
                          />
                          <div className="mt-2 flex flex-wrap gap-2 sm:gap-4 text-xs text-muted-foreground">
                            {sig.ip_address && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                <span className="truncate max-w-[120px]">IP: {sig.ip_address}</span>
                              </span>
                            )}
                            {sig.location_data?.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {sig.location_data.city}, {sig.location_data.country}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Show signing link if not signed and document is sent */}
                      {!sig.signed_at && document.status === 'sent' && (
                        <div className="mt-3 flex items-center gap-2 no-print">
                          <div className="flex-1 p-2 bg-muted/50 rounded text-xs font-mono truncate">
                            {signingUrl}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(signingUrl);
                              toast({ title: 'Signing link copied!' });
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Signature Capture Sheet */}
      <Sheet open={signatureSheetOpen} onOpenChange={setSignatureSheetOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto rounded-t-xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Capture Signature
            </SheetTitle>
            <SheetDescription>
              Capture signature for {selectedSigner?.signer_name}
            </SheetDescription>
          </SheetHeader>
          
          {selectedSigner && (
            <div className="space-y-4">
              {/* Signer Info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedSigner.signer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{selectedSigner.signer_email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{selectedSigner.signer_role}</span>
                  </div>
                </div>
              </div>

              {/* Signature Canvas */}
              <div className="border rounded-lg p-3 sm:p-4 bg-background">
                <SignatureCanvas 
                  ref={signatureCanvasRef}
                  height={180}
                />
              </div>

              {/* Legal Notice */}
              <p className="text-xs text-muted-foreground text-center px-2">
                By signing, you agree to the terms and conditions outlined in this document. 
                Your IP address and timestamp will be recorded for audit purposes.
              </p>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setSignatureSheetOpen(false);
                    setSelectedSigner(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleCaptureSignature}
                  disabled={isSigning}
                >
                  {isSigning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirm Signature
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DocumentView;
