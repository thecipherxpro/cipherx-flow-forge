import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Copy,
  CheckCircle2,
  Lock,
  MapPin,
  Globe,
  User,
  Mail,
  Briefcase,
  Printer,
  ChevronRight,
  AlertCircle,
  Sparkles,
  FileSignature
} from 'lucide-react';
import { format } from 'date-fns';
import { generatePrintPdf, generateExportPdf } from '@/lib/pdf';
import type { 
  DocumentSection, 
  PricingItem, 
  Signature, 
  CompanySettings, 
  ClientContact,
  DocumentData,
  PricingData
} from '@/lib/pdf';
import HtmlContentRenderer from '@/components/HtmlContentRenderer';
import cipherxLogo from '@/assets/cipherx-logo.png';

const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ReactNode; label: string }> = {
  draft: { color: 'text-muted-foreground', bgColor: 'bg-muted', icon: <FileText className="h-4 w-4" />, label: 'Draft' },
  sent: { color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/20', icon: <Clock className="h-4 w-4" />, label: 'Awaiting Signature' },
  signed: { color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20', icon: <CheckCircle2 className="h-4 w-4" />, label: 'Signed' },
  expired: { color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20', icon: <AlertCircle className="h-4 w-4" />, label: 'Expired' },
  cancelled: { color: 'text-muted-foreground', bgColor: 'bg-muted', icon: <AlertCircle className="h-4 w-4" />, label: 'Cancelled' }
};

const documentTypeConfig: Record<string, { label: string; color: string; prefix: string }> = {
  proposal: { label: 'Proposal', color: 'from-blue-500 to-cyan-500', prefix: 'PROP' },
  contract: { label: 'Contract', color: 'from-purple-500 to-pink-500', prefix: 'CONT' },
  sla: { label: 'Service Level Agreement', color: 'from-emerald-500 to-teal-500', prefix: 'SLA' }
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
  const [activeSection, setActiveSection] = useState(0);

  const { data: document, isLoading: docLoading } = useQuery({
    queryKey: ['document', id, 'with-client-legacy-contact'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*, clients(company_name, industry, website, address_line1, address_line2, city, province, postal_code, country, phone, contact_name, contact_email)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: clientContact } = useQuery({
    queryKey: ['client-contact', document?.client_id, 'primary-or-legacy'],
    queryFn: async () => {
      const { data } = await supabase
        .from('client_contacts')
        .select('full_name, email, phone, job_title')
        .eq('client_id', document?.client_id)
        .eq('is_primary', true)
        .maybeSingle();
      
      if (data) return data as ClientContact;
      
      if (document?.clients) {
        const client = document.clients as any;
        if (client.contact_name || client.contact_email) {
          return {
            full_name: client.contact_name || '',
            email: client.contact_email || '',
            phone: client.phone || null,
            job_title: null
          } as ClientContact;
        }
      }
      return null;
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
        .maybeSingle();
      if (error) throw error;
      return data as CompanySettings | null;
    }
  });

  const rawSections = (document?.content as any)?.sections;
  const sections: DocumentSection[] = Array.isArray(rawSections)
    ? rawSections.map((s: any, idx: number) => ({
        key: String(s?.key ?? `section_${idx + 1}`),
        title: String(s?.title ?? s?.section_title ?? `Section ${idx + 1}`),
        content: typeof s?.content === 'string' ? s.content : s?.content == null ? '' : JSON.stringify(s.content, null, 2),
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
      let ipAddress = '0.0.0.0';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;
      } catch {}

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

      const { data: allSigs } = await supabase
        .from('signatures')
        .select('signed_at')
        .eq('document_id', id);

      const allSigned = allSigs?.every(s => s.signed_at !== null);
      if (allSigned) {
        await supabase.from('documents').update({ status: 'signed' }).eq('id', id);
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

  const preparePdfOptions = () => {
    const docConfig = documentTypeConfig[document?.document_type || 'contract'];
    const docNumber = `${docConfig?.prefix || 'DOC'}-${document?.id.slice(0, 8).toUpperCase()}`;
    
    const documentData: DocumentData = {
      id: document?.id || '',
      title: document?.title || '',
      document_type: document?.document_type || 'contract',
      service_type: document?.service_type || 'website_only',
      status: document?.status || 'draft',
      version: document?.version || 1,
      created_at: document?.created_at || new Date().toISOString(),
      updated_at: document?.updated_at || new Date().toISOString(),
      expires_at: document?.expires_at || null,
      compliance_confirmed: document?.compliance_confirmed || false,
      clients: document?.clients || null
    };

    const pricingDataForPdf: PricingData = {
      items: pricingItems,
      subtotal: pricingData?.subtotal || 0,
      discountPercent: pricingData?.discountPercent || 0,
      discountAmount: pricingData?.discountAmount || 0,
      includeHst: pricingData?.includeHst || false,
      hstRate: pricingData?.hstRate || 13,
      hstAmount: pricingData?.hstAmount || 0,
      total: pricingData?.total || 0
    };

    return {
      document: documentData,
      companySettings: companySettings || null,
      clientContact: clientContact || null,
      sections,
      pricingItems,
      pricingData: pricingDataForPdf,
      signatures: signatures || [],
      documentNumber: docNumber
    };
  };

  const handleExportPDF = async () => {
    if (!document) return;
    setIsExporting(true);
    try {
      const options = preparePdfOptions();
      const pdf = await generateExportPdf(options);
      const fileName = `${options.documentNumber}_${document.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      pdf.save(fileName);
      toast({ title: 'PDF exported successfully' });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({ variant: 'destructive', title: 'Failed to export PDF' });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    if (!document) return;
    setIsPrinting(true);
    try {
      const options = preparePdfOptions();
      const pdf = await generatePrintPdf(options);
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => printWindow.print());
      }
      toast({ title: 'Print dialog opened' });
    } catch (error) {
      console.error('Error printing:', error);
      toast({ variant: 'destructive', title: 'Failed to print document' });
    } finally {
      setIsPrinting(false);
    }
  };

  if (docLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex p-6 rounded-full bg-muted mb-4">
          <FileText className="h-12 w-12 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Document not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/documents')}>
          Back to Documents
        </Button>
      </div>
    );
  }

  const docConfig = documentTypeConfig[document.document_type] || documentTypeConfig.proposal;
  const statusCfg = statusConfig[document.status] || statusConfig.draft;
  const docNumber = `${docConfig.prefix}-${document.id.slice(0, 8).toUpperCase()}`;
  const signedCount = signatures?.filter(s => s.signed_at).length || 0;

  return (
    <div className="min-h-screen">
      {/* Document Hero Header */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${docConfig.color} p-6 sm:p-8 mb-6`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white/80 hover:text-white hover:bg-white/20"
              onClick={() => navigate('/admin/documents')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
              {docConfig.label}
            </Badge>
            <Badge className={`${statusCfg.bgColor} ${statusCfg.color} border-0 backdrop-blur-sm flex items-center gap-1`}>
              {statusCfg.icon}
              {statusCfg.label}
            </Badge>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="text-white/60 font-mono text-sm">{docNumber}</p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
                {document.title}
              </h1>
              <div className="flex items-center gap-4 text-white/80 text-sm">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {(document.clients as any)?.company_name || 'Client'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(document.created_at), 'MMMM d, yyyy')}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {document.status === 'draft' && (
                <Button size="sm" variant="secondary" className="bg-white/20 text-white border-0 hover:bg-white/30" asChild>
                  <Link to={`/admin/documents/${id}/edit`}>
                    <Edit className="h-4 w-4 mr-1.5" />
                    Edit
                  </Link>
                </Button>
              )}
              <Button size="sm" variant="secondary" className="bg-white/20 text-white border-0 hover:bg-white/30" onClick={handlePrint} disabled={isPrinting}>
                {isPrinting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Printer className="h-4 w-4 mr-1.5" />}
                Print
              </Button>
              <Button size="sm" variant="secondary" className="bg-white/20 text-white border-0 hover:bg-white/30" onClick={handleExportPDF} disabled={isExporting}>
                {isExporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                PDF
              </Button>
              {document.status === 'draft' && (
                <Button size="sm" className="bg-white text-primary hover:bg-white/90">
                  <Send className="h-4 w-4 mr-1.5" />
                  Send
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6" ref={printRef}>
        {/* Sidebar Navigation */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <Card className="overflow-hidden">
            <div className="p-4 bg-muted/50 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick Overview
              </h3>
            </div>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Service</span>
                <span className="text-sm font-medium">{serviceTypeLabels[document.service_type]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Signatures</span>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    {signatures?.slice(0, 3).map((sig, i) => (
                      <div 
                        key={i} 
                        className={`w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium ${
                          sig.signed_at ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                        }`}
                      >
                        {sig.signer_name[0]}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm font-medium">{signedCount}/{signatures?.length || 0}</span>
                </div>
              </div>
              {pricingData.total && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Value</span>
                  <span className="text-sm font-bold text-primary">{formatCurrency(pricingData.total)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <Badge variant="outline" className="text-xs">v{document.version || 1}</Badge>
              </div>
              {document.compliance_confirmed && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Compliance Confirmed</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section Navigation */}
          {sections.length > 0 && (
            <Card className="overflow-hidden">
              <div className="p-4 bg-muted/50 border-b">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Contents
                </h3>
              </div>
              <ScrollArea className="max-h-[300px]">
                <div className="p-2">
                  {sections.map((section, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveSection(index)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2 ${
                        activeSection === index 
                          ? 'bg-primary text-primary-foreground font-medium' 
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        activeSection === index ? 'bg-primary-foreground/20' : 'bg-muted'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="truncate flex-1">{section.title}</span>
                      <ChevronRight className={`h-4 w-4 transition-transform ${activeSection === index ? 'rotate-90' : ''}`} />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}

          {/* Signatures Card */}
          {signatures && signatures.length > 0 && (
            <Card className="overflow-hidden">
              <div className="p-4 bg-muted/50 border-b">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <FileSignature className="h-4 w-4 text-primary" />
                  Signatures
                </h3>
              </div>
              <CardContent className="p-3 space-y-2">
                {signatures.map((sig) => (
                  <div 
                    key={sig.id} 
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      sig.signed_at 
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' 
                        : 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800 hover:bg-amber-100'
                    }`}
                    onClick={() => !sig.signed_at && document.status !== 'signed' && handleOpenSignatureSheet(sig)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{sig.signer_name}</p>
                        <p className="text-xs text-muted-foreground">{sig.signer_role}</p>
                      </div>
                      {sig.signed_at ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                      )}
                    </div>
                    {sig.signed_at ? (
                      <p className="text-xs text-muted-foreground mt-2">
                        Signed {format(new Date(sig.signed_at), 'MMM d, yyyy')}
                      </p>
                    ) : document.status !== 'signed' && (
                      <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs">
                        <PenTool className="h-3 w-3 mr-1" />
                        Sign Now
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Document Content */}
          {sections.length > 0 && (
            <Card className="overflow-hidden">
              <div className="p-4 sm:p-6 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${docConfig.color} flex items-center justify-center text-white font-bold`}>
                      {activeSection + 1}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{sections[activeSection]?.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        Section {activeSection + 1} of {sections.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activeSection === 0}
                      onClick={() => setActiveSection(prev => prev - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activeSection === sections.length - 1}
                      onClick={() => setActiveSection(prev => prev + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
              <CardContent className="p-6 sm:p-8">
                <HtmlContentRenderer 
                  content={sections[activeSection]?.content || ''} 
                  className="text-base"
                />
              </CardContent>
              
              {/* Section Progress */}
              <div className="p-4 border-t bg-muted/30">
                <div className="flex items-center gap-2">
                  {sections.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveSection(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === activeSection 
                          ? 'bg-primary w-8' 
                          : 'bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Pricing Section */}
          {pricingItems.length > 0 && (
            <Card className="overflow-hidden">
              <div className="p-4 sm:p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  Pricing Breakdown
                </h2>
              </div>
              <CardContent className="p-0">
                <div className="divide-y">
                  {pricingItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 sm:p-6 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{item.description || item.name || 'Unnamed Item'}</p>
                          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                            <span>{formatCurrency(item.unitPrice)} × {item.quantity}</span>
                          </div>
                        </div>
                      </div>
                      <p className="font-bold text-lg">{formatCurrency(item.unitPrice * item.quantity)}</p>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="p-4 sm:p-6 bg-primary/5 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(pricingData.subtotal || 0)}</span>
                  </div>
                  {pricingData.discountAmount && pricingData.discountAmount > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-600">
                      <span>Discount ({pricingData.discountPercent || 0}%)</span>
                      <span>-{formatCurrency(pricingData.discountAmount)}</span>
                    </div>
                  )}
                  {pricingData.includeHst && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">HST ({pricingData.hstRate || 13}%)</span>
                      <span className="font-medium">{formatCurrency(pricingData.hstAmount || 0)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(pricingData.total || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Company Footer */}
          {companySettings && (
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <img 
                    src={companySettings.logo_url || cipherxLogo} 
                    alt={companySettings.company_name}
                    className="h-12 w-12 object-contain rounded-lg"
                  />
                  <div>
                    <p className="font-semibold">{companySettings.company_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {[companySettings.city, companySettings.province, companySettings.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
                {companySettings.footer_text && (
                  <p className="text-sm text-muted-foreground mt-4 pt-4 border-t">
                    {companySettings.footer_text}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
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
              
              <div>
                <p className="text-sm font-medium mb-2">Draw your signature below:</p>
                <SignatureCanvas ref={signatureCanvasRef} />
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => signatureCanvasRef.current?.clear()}>
                  Clear
                </Button>
                <Button className="flex-1" onClick={handleCaptureSignature} disabled={isSigning}>
                  {isSigning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Confirm Signature
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
