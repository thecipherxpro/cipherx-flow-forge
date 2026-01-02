import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
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
  Globe
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
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

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

  const { data: signatures } = useQuery({
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
      
      // Helper to add text
      const addText = (text: string, x: number, y: number, options?: { fontSize?: number; color?: string; fontStyle?: string; maxWidth?: number }) => {
        pdf.setFontSize(options?.fontSize || 12);
        pdf.setTextColor(options?.color || '#1f2937');
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
      // Background header
      pdf.setFillColor(primaryColor);
      pdf.rect(0, 0, pageWidth, 100, 'F');
      
      // Company name
      addText(companySettings?.company_name || 'CipherX Solutions', margin, 40, { 
        fontSize: 28, 
        color: '#ffffff',
        fontStyle: 'bold'
      });
      
      // Document type
      addText(documentTypeLabels[document.document_type] || document.document_type, margin, 55, { 
        fontSize: 16, 
        color: '#ffffff' 
      });

      // Document title
      addText(document.title, margin, 130, { 
        fontSize: 24, 
        fontStyle: 'bold',
        maxWidth: contentWidth
      });

      // Client info box
      pdf.setFillColor('#f3f4f6');
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

      // Date info
      addText('Date: ' + format(new Date(document.created_at), 'MMMM d, yyyy'), margin, 220, { fontSize: 12 });
      if (document.expires_at) {
        addText('Valid Until: ' + format(new Date(document.expires_at), 'MMMM d, yyyy'), margin, 232, { fontSize: 12 });
      }

      // Status badge
      addText('Status: ' + document.status.toUpperCase(), margin, 250, { fontSize: 12, fontStyle: 'bold' });

      // Footer on cover
      pdf.setFillColor(secondaryColor);
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
      let pageNumber = 3; // Starting page for content
      
      sections.forEach((section, idx) => {
        addText(`${idx + 1}. ${section.title}`, margin, tocY, { fontSize: 12 });
        addText(`${pageNumber}`, pageWidth - margin - 10, tocY, { fontSize: 12, color: '#6b7280' });
        tocY += 12;
        
        // Approximate page increment (simplified)
        if ((section.content?.length || 0) > 1000) pageNumber++;
        pageNumber++;
      });

      // Add pricing and signatures to TOC
      tocY += 10;
      addText(`${sections.length + 1}. Pricing & Investment`, margin, tocY, { fontSize: 12 });
      tocY += 12;
      addText(`${sections.length + 2}. Signatures`, margin, tocY, { fontSize: 12 });

      // ===== CONTENT PAGES =====
      sections.forEach((section, idx) => {
        pdf.addPage();
        
        // Section header
        pdf.setFillColor(primaryColor);
        pdf.rect(0, 0, pageWidth, 25, 'F');
        addText(`Section ${idx + 1}`, margin, 16, { fontSize: 10, color: '#ffffff' });
        
        addText(section.title, margin, 45, { fontSize: 18, fontStyle: 'bold' });
        
        // Section content - split into lines
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

        // Page number footer
        pdf.setFontSize(9);
        pdf.setTextColor('#9ca3af');
        pdf.text(`${document.title} | Page ${pdf.getNumberOfPages()}`, margin, pageHeight - 10);
      });

      // ===== PRICING PAGE =====
      if (pricingItems.length > 0) {
        pdf.addPage();
        
        pdf.setFillColor(primaryColor);
        pdf.rect(0, 0, pageWidth, 25, 'F');
        addText('Investment', margin, 16, { fontSize: 10, color: '#ffffff' });
        
        addText('Pricing & Investment', margin, 45, { fontSize: 18, fontStyle: 'bold' });

        // Pricing table header
        let tableY = 60;
        pdf.setFillColor('#f3f4f6');
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

        // Totals
        tableY += 5;
        pdf.setDrawColor('#e5e7eb');
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
        pdf.setFillColor(primaryColor);
        pdf.rect(margin + 100, tableY - 5, 70, 12, 'F');
        addText('Total:', margin + 110, tableY + 3, { fontSize: 12, fontStyle: 'bold', color: '#ffffff' });
        addText(formatCurrency(pricingData.total || 0), margin + 145, tableY + 3, { fontSize: 12, fontStyle: 'bold', color: '#ffffff' });
      }

      // ===== SIGNATURE PAGE =====
      if (signatures && signatures.length > 0) {
        pdf.addPage();
        
        pdf.setFillColor(primaryColor);
        pdf.rect(0, 0, pageWidth, 25, 'F');
        addText('Signatures', margin, 16, { fontSize: 10, color: '#ffffff' });
        
        addText('Signature Page', margin, 45, { fontSize: 18, fontStyle: 'bold' });
        addText('By signing below, the parties agree to the terms and conditions outlined in this document.', margin, 58, { fontSize: 10, color: '#6b7280' });

        let sigY = 80;
        signatures.forEach((sig) => {
          pdf.setFillColor('#f9fafb');
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
      
      pdf.setFillColor(primaryColor);
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

      // Final footer
      pdf.setFillColor('#f3f4f6');
      pdf.rect(0, pageHeight - 25, pageWidth, 25, 'F');
      addText('This document was generated by ' + (companySettings?.company_name || 'CipherX Solutions'), margin, pageHeight - 12, { fontSize: 9, color: '#6b7280' });
      addText(format(new Date(), 'MMMM d, yyyy'), pageWidth - margin - 40, pageHeight - 12, { fontSize: 9, color: '#6b7280' });

      // Save the PDF
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/documents')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{document.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline">{documentTypeLabels[document.document_type]}</Badge>
              <Badge className={statusColors[document.status]}>{document.status}</Badge>
              <span className="text-sm text-muted-foreground">v{document.version}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {document.status === 'draft' && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/documents/${id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export PDF
          </Button>
          {document.status === 'draft' && (
            <Button size="sm">
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          )}
        </div>
      </div>

      {/* Document Preview */}
      <div ref={printRef} className="space-y-4">
        {/* Meta Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{document.clients?.company_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Service Type</p>
                  <p className="font-medium">{serviceTypeLabels[document.service_type]}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{format(new Date(document.created_at), 'MMM d, yyyy')}</p>
                </div>
              </div>
              {document.expires_at && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Expires</p>
                    <p className="font-medium">{format(new Date(document.expires_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        {sections.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Sections
              </h2>
              <div className="space-y-6">
                {sections.map((section, idx) => (
                  <div key={section.key || idx}>
                    <h3 className="font-medium text-base mb-2">{section.title}</h3>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {section.content}
                    </div>
                    {idx < sections.length - 1 && <Separator className="mt-6" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing */}
        {pricingItems.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing & Investment
              </h2>
              <div className="overflow-x-auto">
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
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Compliance Confirmed</p>
                  <p className="text-sm text-muted-foreground">
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
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <PenTool className="h-5 w-5" />
                  Signatures
                </h2>
                {document.status === 'signed' && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    <Lock className="h-3 w-3 mr-1" />
                    Document Locked
                  </Badge>
                )}
              </div>
              <div className="space-y-4">
                {signatures.map((sig) => {
                  const signingUrl = `${window.location.origin}/sign/${id}?sig=${sig.id}`;
                  
                  return (
                    <div key={sig.id} className="border rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">{sig.signer_role}</p>
                          <p className="font-medium">{sig.signer_name}</p>
                          <p className="text-sm text-muted-foreground">{sig.signer_email}</p>
                        </div>
                        {sig.signed_at ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 w-fit">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Signed {format(new Date(sig.signed_at), 'MMM d, yyyy h:mm a')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 w-fit">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      
                      {/* Show signature image if signed */}
                      {sig.signed_at && sig.signature_data && (
                        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                          <img 
                            src={sig.signature_data} 
                            alt={`Signature of ${sig.signer_name}`}
                            className="h-16 object-contain"
                          />
                          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                            {sig.ip_address && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                IP: {sig.ip_address}
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
                            onClick={() => {
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
    </div>
  );
};

export default DocumentView;
