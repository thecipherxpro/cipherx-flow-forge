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
  Briefcase
} from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
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
  const [signatureSheetOpen, setSignatureSheetOpen] = useState(false);
  const [selectedSigner, setSelectedSigner] = useState<Signature | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const { data: document, isLoading: docLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*, clients(company_name, address_line1, city, province, postal_code, country)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
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

  const sections: DocumentSection[] = (document?.content as any)?.sections || [];
  const pricingData = document?.pricing_data as any || {};
  const pricingItems: PricingItem[] = pricingData.items || [];

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
    } : { r: 15, g: 23, b: 42 }; // Default dark color
  };

  const handleExportPDF = async () => {
    if (!printRef.current || !document) return;
    
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      const primaryColor = companySettings?.primary_color || '#0F172A';
      const secondaryColor = companySettings?.secondary_color || '#3B82F6';
      const primaryRgb = hexToRgb(primaryColor);
      const secondaryRgb = hexToRgb(secondaryColor);
      
      // Helper to add text
      const addText = (text: string, x: number, y: number, options?: { fontSize?: number; color?: string; fontStyle?: string; maxWidth?: number }) => {
        pdf.setFontSize(options?.fontSize || 12);
        const textColor = options?.color || '#1f2937';
        const textRgb = hexToRgb(textColor);
        pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
        if (options?.fontStyle) {
          pdf.setFont('helvetica', options.fontStyle);
        } else {
          pdf.setFont('helvetica', 'normal');
        }
        if (options?.maxWidth) {
          pdf.text(text, x, y, { maxWidth: options.maxWidth });
        } else {
          pdf.text(text, x, y);
        }
      };

      // ===== COVER PAGE =====
      pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.rect(0, 0, pageWidth, 100, 'F');
      
      addText(companySettings?.company_name || 'CipherX Solutions', margin, 40, { 
        fontSize: 28, 
        color: '#ffffff',
        fontStyle: 'bold'
      });
      
      addText(documentTypeLabels[document.document_type] || document.document_type, margin, 55, { 
        fontSize: 16, 
        color: '#ffffff' 
      });

      addText(document.title, margin, 130, { 
        fontSize: 24, 
        fontStyle: 'bold',
        maxWidth: contentWidth
      });

      const grayBgRgb = hexToRgb('#f3f4f6');
      pdf.setFillColor(grayBgRgb.r, grayBgRgb.g, grayBgRgb.b);
      pdf.roundedRect(margin, 150, contentWidth, 50, 3, 3, 'F');
      
      addText('PREPARED FOR', margin + 10, 165, { fontSize: 10, color: '#6b7280', fontStyle: 'bold' });
      addText(document.clients?.company_name || 'Client', margin + 10, 178, { fontSize: 16, fontStyle: 'bold' });
      
      const clientAddress = [
        document.clients?.address_line1,
        document.clients?.city,
        document.clients?.province,
        document.clients?.postal_code
      ].filter(Boolean).join(', ');
      if (clientAddress) {
        addText(clientAddress, margin + 10, 190, { fontSize: 10, color: '#6b7280' });
      }

      addText('Date: ' + format(new Date(document.created_at), 'MMMM d, yyyy'), margin, 220, { fontSize: 12 });
      if (document.expires_at) {
        addText('Valid Until: ' + format(new Date(document.expires_at), 'MMMM d, yyyy'), margin, 232, { fontSize: 12 });
      }

      addText('Status: ' + document.status.toUpperCase(), margin, 250, { fontSize: 12, fontStyle: 'bold' });

      pdf.setFillColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
      pdf.rect(0, pageHeight - 30, pageWidth, 30, 'F');
      
      const companyAddress = [
        companySettings?.address_line1,
        companySettings?.city,
        companySettings?.province,
        companySettings?.postal_code
      ].filter(Boolean).join(' • ');
      
      addText(companyAddress || '', margin, pageHeight - 15, { fontSize: 9, color: '#ffffff' });
      addText(companySettings?.email || '', pageWidth - margin - 50, pageHeight - 15, { fontSize: 9, color: '#ffffff' });

      // ===== TABLE OF CONTENTS =====
      pdf.addPage();
      
      addText('Table of Contents', margin, 30, { fontSize: 22, fontStyle: 'bold' });
      
      let tocY = 50;
      let pageNumber = 3;
      
      sections.forEach((section, idx) => {
        addText(`${idx + 1}. ${section.title}`, margin, tocY, { fontSize: 12 });
        addText(`${pageNumber}`, pageWidth - margin - 10, tocY, { fontSize: 12, color: '#6b7280' });
        tocY += 12;
        
        if ((section.content?.length || 0) > 1000) pageNumber++;
        pageNumber++;
      });

      tocY += 10;
      addText(`${sections.length + 1}. Pricing & Investment`, margin, tocY, { fontSize: 12 });
      tocY += 12;
      addText(`${sections.length + 2}. Signatures`, margin, tocY, { fontSize: 12 });

      // ===== CONTENT PAGES =====
      sections.forEach((section, idx) => {
        pdf.addPage();
        
        pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        pdf.rect(0, 0, pageWidth, 25, 'F');
        addText(`Section ${idx + 1}`, margin, 16, { fontSize: 10, color: '#ffffff' });
        
        addText(section.title, margin, 45, { fontSize: 18, fontStyle: 'bold' });
        
        const content = section.content || '';
        const lines = pdf.splitTextToSize(content, contentWidth);
        
        let yPos = 60;
        lines.forEach((line: string) => {
          if (yPos > pageHeight - 40) {
            pdf.addPage();
            yPos = 30;
          }
          addText(line, margin, yPos, { fontSize: 11 });
          yPos += 6;
        });

        const footerGrayRgb = hexToRgb('#9ca3af');
        pdf.setFontSize(9);
        pdf.setTextColor(footerGrayRgb.r, footerGrayRgb.g, footerGrayRgb.b);
        pdf.text(`${document.title} | Page ${pdf.getNumberOfPages()}`, margin, pageHeight - 10);
      });

      // ===== PRICING PAGE =====
      if (pricingItems.length > 0) {
        pdf.addPage();
        
        pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        pdf.rect(0, 0, pageWidth, 25, 'F');
        addText('Investment', margin, 16, { fontSize: 10, color: '#ffffff' });
        
        addText('Pricing & Investment', margin, 45, { fontSize: 18, fontStyle: 'bold' });

        let tableY = 60;
        const tableHeaderRgb = hexToRgb('#f3f4f6');
        pdf.setFillColor(tableHeaderRgb.r, tableHeaderRgb.g, tableHeaderRgb.b);
        pdf.rect(margin, tableY, contentWidth, 10, 'F');
        
        addText('Item', margin + 5, tableY + 7, { fontSize: 10, fontStyle: 'bold' });
        addText('Qty', margin + 90, tableY + 7, { fontSize: 10, fontStyle: 'bold' });
        addText('Unit Price', margin + 110, tableY + 7, { fontSize: 10, fontStyle: 'bold' });
        addText('Total', margin + 145, tableY + 7, { fontSize: 10, fontStyle: 'bold' });
        
        tableY += 15;
        
        pricingItems.forEach((item) => {
          addText(item.name, margin + 5, tableY, { fontSize: 10, maxWidth: 80 });
          addText(item.quantity.toString(), margin + 90, tableY, { fontSize: 10 });
          addText(formatCurrency(item.unitPrice), margin + 110, tableY, { fontSize: 10 });
          addText(formatCurrency(item.quantity * item.unitPrice), margin + 145, tableY, { fontSize: 10 });
          tableY += 10;
        });

        tableY += 5;
        const lineColorRgb = hexToRgb('#e5e7eb');
        pdf.setDrawColor(lineColorRgb.r, lineColorRgb.g, lineColorRgb.b);
        pdf.line(margin, tableY, margin + contentWidth, tableY);
        tableY += 10;
        
        addText('Subtotal:', margin + 110, tableY, { fontSize: 11 });
        addText(formatCurrency(pricingData.subtotal || 0), margin + 145, tableY, { fontSize: 11 });
        
        if (pricingData.discountAmount > 0) {
          tableY += 10;
          addText('Discount:', margin + 110, tableY, { fontSize: 11, color: '#16a34a' });
          addText('-' + formatCurrency(pricingData.discountAmount), margin + 145, tableY, { fontSize: 11, color: '#16a34a' });
        }
        
        tableY += 12;
        pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        pdf.rect(margin + 100, tableY - 5, 70, 12, 'F');
        addText('Total:', margin + 110, tableY + 3, { fontSize: 12, fontStyle: 'bold', color: '#ffffff' });
        addText(formatCurrency(pricingData.total || 0), margin + 145, tableY + 3, { fontSize: 12, fontStyle: 'bold', color: '#ffffff' });
      }

      // ===== SIGNATURE PAGE =====
      if (signatures && signatures.length > 0) {
        pdf.addPage();
        
        pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        pdf.rect(0, 0, pageWidth, 25, 'F');
        addText('Signatures', margin, 16, { fontSize: 10, color: '#ffffff' });
        
        addText('Signature Page', margin, 45, { fontSize: 18, fontStyle: 'bold' });
        addText('By signing below, the parties agree to the terms and conditions outlined in this document.', margin, 58, { fontSize: 10, color: '#6b7280' });

        let sigY = 80;
        signatures.forEach((sig) => {
          const sigBoxRgb = hexToRgb('#f9fafb');
          pdf.setFillColor(sigBoxRgb.r, sigBoxRgb.g, sigBoxRgb.b);
          pdf.roundedRect(margin, sigY, contentWidth, 40, 3, 3, 'F');
          
          addText(sig.signer_role, margin + 10, sigY + 12, { fontSize: 10, color: '#6b7280' });
          addText(sig.signer_name, margin + 10, sigY + 24, { fontSize: 12, fontStyle: 'bold' });
          addText(sig.signer_email, margin + 10, sigY + 34, { fontSize: 10, color: '#6b7280' });
          
          if (sig.signed_at) {
            addText('✓ Signed on ' + format(new Date(sig.signed_at), 'MMM d, yyyy'), margin + 120, sigY + 24, { fontSize: 10, color: '#16a34a' });
          } else {
            addText('Pending signature', margin + 120, sigY + 24, { fontSize: 10, color: '#f59e0b' });
          }
          
          sigY += 50;
        });
      }

      // ===== AUDIT SUMMARY PAGE =====
      pdf.addPage();
      
      pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.rect(0, 0, pageWidth, 25, 'F');
      addText('Audit Trail', margin, 16, { fontSize: 10, color: '#ffffff' });
      
      addText('Document Audit Summary', margin, 45, { fontSize: 18, fontStyle: 'bold' });
      
      addText('Document ID:', margin, 70, { fontSize: 10, fontStyle: 'bold' });
      addText(document.id, margin + 35, 70, { fontSize: 10, color: '#6b7280' });
      
      addText('Created:', margin, 82, { fontSize: 10, fontStyle: 'bold' });
      addText(format(new Date(document.created_at), 'MMMM d, yyyy h:mm a'), margin + 35, 82, { fontSize: 10 });
      
      addText('Last Updated:', margin, 94, { fontSize: 10, fontStyle: 'bold' });
      addText(format(new Date(document.updated_at), 'MMMM d, yyyy h:mm a'), margin + 35, 94, { fontSize: 10 });
      
      addText('Version:', margin, 106, { fontSize: 10, fontStyle: 'bold' });
      addText(`v${document.version}`, margin + 35, 106, { fontSize: 10 });
      
      addText('Compliance Confirmed:', margin, 118, { fontSize: 10, fontStyle: 'bold' });
      addText(document.compliance_confirmed ? 'Yes' : 'No', margin + 50, 118, { fontSize: 10 });

      const footerBgRgb = hexToRgb('#f3f4f6');
      pdf.setFillColor(footerBgRgb.r, footerBgRgb.g, footerBgRgb.b);
      pdf.rect(0, pageHeight - 25, pageWidth, 25, 'F');
      addText('This document was generated by ' + (companySettings?.company_name || 'CipherX Solutions'), margin, pageHeight - 12, { fontSize: 9, color: '#6b7280' });
      addText(format(new Date(), 'MMMM d, yyyy'), pageWidth - margin - 40, pageHeight - 12, { fontSize: 9, color: '#6b7280' });

      pdf.save(`${document.title.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({ title: 'PDF exported successfully' });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({ variant: 'destructive', title: 'Failed to export PDF' });
    } finally {
      setIsExporting(false);
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
            className="shrink-0 h-9 w-9 sm:h-10 sm:w-10"
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
        <div className="flex flex-wrap gap-2">
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
      <div ref={printRef} className="space-y-3 sm:space-y-4">
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
          <Card>
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
          <Card>
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
          <Card>
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
                        <div className="flex items-center gap-2">
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
                        <div className="mt-3 flex items-center gap-2">
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