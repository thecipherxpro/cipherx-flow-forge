import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Download, 
  Loader2,
  FileText,
  Calendar,
  DollarSign,
  PenTool,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { generateExportPdf } from '@/lib/pdf';
import type { 
  DocumentSection, 
  PricingItem, 
  Signature, 
  CompanySettings, 
  ClientContact,
  DocumentData,
  PricingData,
  PdfGeneratorOptions
} from '@/lib/pdf';
import { useToast } from '@/hooks/use-toast';

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

const PortalDocumentView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clientId } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Document not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/portal/documents')}>
          Back to Documents
        </Button>
      </div>
    );
  }

  const sections = (document.content as any)?.sections as DocumentSection[] || [];
  const pricing = (document.content as any)?.pricing as PricingData || null;
  const docNumber = `${documentTypePrefixes[document.document_type] || 'DOC'}-${document.id.slice(0, 8).toUpperCase()}`;

  const allSigned = signatures?.every(s => s.signed_at) ?? false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/portal/documents')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{document.title}</h1>
              <Badge className={statusColors[document.status] || ''}>
                {document.status === 'sent' ? 'Awaiting Signature' : document.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {documentTypeLabels[document.document_type]} • {docNumber}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {document.status === 'sent' && (
            <Button asChild>
              <Link to={`/sign/${document.id}`}>
                <PenTool className="h-4 w-4 mr-2" />
                Sign Document
              </Link>
            </Button>
          )}
          {document.status === 'signed' && (
            <Button onClick={handleExportPDF} disabled={isExporting}>
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

      {/* Document Info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Document Type</p>
                <p className="font-medium">{documentTypeLabels[document.document_type]}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {document.sent_at ? 'Sent Date' : 'Created Date'}
                </p>
                <p className="font-medium">
                  {document.sent_at 
                    ? format(new Date(document.sent_at), 'MMM d, yyyy')
                    : format(new Date(document.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {allSigned ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <PenTool className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Signature Status</p>
                <p className="font-medium">
                  {allSigned 
                    ? 'All Signed' 
                    : `${signatures?.filter(s => s.signed_at).length || 0} of ${signatures?.length || 0} signed`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Sections */}
      {sections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Document Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {sections.map((section, index) => (
              <div key={index}>
                <h3 className="font-semibold text-lg mb-2">{section.title}</h3>
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: section.content.replace(/\n/g, '<br/>') }}
                />
                {index < sections.length - 1 && <Separator className="mt-6" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pricing */}
      {pricing && pricing.items && pricing.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pricing.items.map((item, index) => (
                <div key={index} className="flex justify-between items-start py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.name || item.description}</p>
                    {item.quantity && item.quantity > 1 && (
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    )}
                  </div>
                  <p className="font-medium">
                    {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(item.unitPrice * item.quantity)}
                  </p>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between items-center pt-2">
                <p className="font-semibold text-lg">Total</p>
                <p className="font-bold text-lg">
                  {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(pricing.total || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signatures */}
      {signatures && signatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Signatures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {signatures.map((sig) => (
                <div key={sig.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{sig.signer_name}</p>
                    <p className="text-sm text-muted-foreground">{sig.signer_role}</p>
                  </div>
                  {sig.signed_at ? (
                    <div className="text-right">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Signed
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(sig.signed_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      Pending
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PortalDocumentView;
