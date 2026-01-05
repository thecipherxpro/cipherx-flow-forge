import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Download, 
  Loader2,
  FileText,
  Calendar,
  DollarSign,
  PenTool,
  CheckCircle2,
  Clock,
  Building2,
  FileSignature,
  ChevronRight,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import HtmlContentRenderer from '@/components/HtmlContentRenderer';
import { format } from 'date-fns';
import { generateExportPdf } from '@/lib/pdf';
import type { 
  DocumentSection, 
  Signature, 
  CompanySettings, 
  ClientContact,
  DocumentData,
  PricingData,
  PdfGeneratorOptions
} from '@/lib/pdf';
import { useToast } from '@/hooks/use-toast';
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

const PortalDocumentView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clientId } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  const { data: document, isLoading: docLoading } = useQuery({
    queryKey: ['portal-document', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*, clients(company_name, industry, website, address_line1, address_line2, city, province, postal_code, country, phone, contact_name, contact_email)')
        .eq('id', id)
        .eq('client_id', clientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!clientId
  });

  const { data: signatures } = useQuery({
    queryKey: ['portal-signatures', id],
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

  const handleExportPDF = async () => {
    if (!document) return;
    setIsExporting(true);
    
    try {
      const sections = (document.content as any)?.sections as DocumentSection[] || [];
      const pricing = (document.content as any)?.pricing as PricingData || {};
      
      const clientContact: ClientContact | null = document.clients ? {
        full_name: (document.clients as any).contact_name || '',
        email: (document.clients as any).contact_email || '',
        phone: (document.clients as any).phone || null,
        job_title: null
      } : null;

      const docData: DocumentData = {
        id: document.id,
        title: document.title,
        document_type: document.document_type,
        service_type: document.service_type,
        status: document.status,
        created_at: document.created_at,
        updated_at: document.updated_at,
        expires_at: document.expires_at,
        version: document.version,
        compliance_confirmed: document.compliance_confirmed,
        clients: document.clients ? {
          company_name: (document.clients as any).company_name || '',
          industry: (document.clients as any).industry || undefined,
          website: (document.clients as any).website || undefined,
          address_line1: (document.clients as any).address_line1 || undefined,
          address_line2: (document.clients as any).address_line2 || undefined,
          city: (document.clients as any).city || undefined,
          province: (document.clients as any).province || undefined,
          postal_code: (document.clients as any).postal_code || undefined,
          country: (document.clients as any).country || undefined,
          phone: (document.clients as any).phone || undefined,
        } : undefined,
      };

      const pdfOptions: PdfGeneratorOptions = {
        document: docData,
        sections,
        pricingData: pricing,
        pricingItems: pricing.items || [],
        signatures: signatures || [],
        companySettings: companySettings || null,
        clientContact
      };

      const pdf = await generateExportPdf(pdfOptions);
      pdf.save(`${document.title.replace(/\s+/g, '_')}.pdf`);
      toast({ title: 'PDF downloaded successfully' });
    } catch (error) {
      console.error('Export error:', error);
      toast({ 
        variant: 'destructive',
        title: 'Export failed',
        description: 'There was an error generating the PDF'
      });
    } finally {
      setIsExporting(false);
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
        <Button variant="outline" className="mt-4" onClick={() => navigate('/portal/documents')}>
          Back to Documents
        </Button>
      </div>
    );
  }

  const sections = (document.content as any)?.sections as DocumentSection[] || [];
  const pricing = (document.content as any)?.pricing as PricingData || null;
  const docConfig = documentTypeConfig[document.document_type] || documentTypeConfig.proposal;
  const statusCfg = statusConfig[document.status] || statusConfig.draft;
  const docNumber = `${docConfig.prefix}-${document.id.slice(0, 8).toUpperCase()}`;
  const allSigned = signatures?.every(s => s.signed_at) ?? false;
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
              onClick={() => navigate('/portal/documents')}
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
                  {document.sent_at 
                    ? format(new Date(document.sent_at), 'MMMM d, yyyy')
                    : format(new Date(document.created_at), 'MMMM d, yyyy')}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              {document.status === 'sent' && (
                <Button 
                  size="lg" 
                  className="bg-white text-primary hover:bg-white/90 shadow-lg"
                  asChild
                >
                  <Link to={`/sign/${document.id}`}>
                    <PenTool className="h-4 w-4 mr-2" />
                    Sign Document
                  </Link>
                </Button>
              )}
              {document.status === 'signed' && (
                <Button 
                  size="lg"
                  onClick={handleExportPDF} 
                  disabled={isExporting}
                  className="bg-white text-primary hover:bg-white/90 shadow-lg"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download PDF
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
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
                <span className="text-sm text-muted-foreground">Signatures</span>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    {signatures?.slice(0, 3).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium ${
                          signatures[i].signed_at 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-amber-100 text-amber-600'
                        }`}
                      >
                        {signatures[i].signer_name[0]}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm font-medium">{signedCount}/{signatures?.length || 0}</span>
                </div>
              </div>
              {pricing && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Value</span>
                  <span className="text-sm font-bold text-primary">
                    {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(pricing.total || 0)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <Badge variant="outline" className="text-xs">v{document.version || 1}</Badge>
              </div>
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
                    className={`p-3 rounded-lg border ${
                      sig.signed_at 
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' 
                        : 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800'
                    }`}
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
                    {sig.signed_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Signed {format(new Date(sig.signed_at), 'MMM d, yyyy')}
                      </p>
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
          {pricing && pricing.items && pricing.items.length > 0 && (
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
                  {pricing.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 sm:p-6 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{item.description || item.name || 'Unnamed Item'}</p>
                          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                            <span>
                              {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(item.unitPrice)} × {item.quantity}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="font-bold text-lg">
                        {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="p-4 sm:p-6 bg-primary/5 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(pricing.subtotal || 0)}
                    </span>
                  </div>
                  {pricing.discountAmount && pricing.discountAmount > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-600">
                      <span>Discount ({pricing.discountPercent || 0}%)</span>
                      <span>-{new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(pricing.discountAmount)}</span>
                    </div>
                  )}
                  {pricing.includeHst && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">HST ({pricing.hstRate || 13}%)</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(pricing.hstAmount || 0)}
                      </span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="text-2xl font-bold text-primary">
                      {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(pricing.total || 0)}
                    </span>
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
    </div>
  );
};

export default PortalDocumentView;
