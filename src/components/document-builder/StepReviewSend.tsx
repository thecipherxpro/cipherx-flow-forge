import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, FileText, DollarSign, Users, CheckCircle } from 'lucide-react';
import { serviceTypeLabels, documentTypeLabels, type TemplateSection, type PricingItem } from '@/lib/templates/service-templates';
import type { Database } from '@/integrations/supabase/types';

type DocumentType = Database['public']['Enums']['document_type'];
type ServiceType = Database['public']['Enums']['service_type'];

interface Signer {
  id: string;
  name: string;
  email: string;
  role: string;
  isRequired: boolean;
}

interface Client {
  id: string;
  company_name: string;
}

interface Props {
  client: Client | null;
  documentType: DocumentType | null;
  serviceType: ServiceType | null;
  title: string;
  sections: TemplateSection[];
  pricingItems: PricingItem[];
  discount: { type: 'percentage' | 'fixed'; value: number };
  totals: { subtotal: number; discountAmount: number; total: number };
  signers: Signer[];
  processContent: (content: string) => string;
}

export function StepReviewSend({
  client,
  documentType,
  serviceType,
  title,
  sections,
  pricingItems,
  discount,
  totals,
  signers,
  processContent,
}: Props) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">{client?.company_name || 'Not selected'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Document</p>
                <p className="font-medium">{documentType ? documentTypeLabels[documentType] : 'Not selected'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="font-medium">{formatCurrency(totals.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Signers</p>
                <p className="font-medium">{signers.length} people</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Document Preview</CardTitle>
            <CardDescription>{title}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {sections.sort((a, b) => a.sortOrder - b.sortOrder).map((section) => (
                  <div key={section.key}>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{section.title}</h4>
                      {section.isLocked && <Badge variant="outline" className="text-xs">Legal</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {processContent(section.content).substring(0, 300)}
                      {section.content.length > 300 && '...'}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pricingItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.description}</span>
                    <span>{formatCurrency(item.quantity * item.unitPrice)}</span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {discount.value > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Discount ({discount.type === 'percentage' ? `${discount.value}%` : 'Fixed'})</span>
                    <span>-{formatCurrency(totals.discountAmount)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Signers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {signers.map((signer, idx) => (
                  <div key={signer.id} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{signer.name || 'Name pending'}</p>
                      <p className="text-xs text-muted-foreground">{signer.email || 'Email pending'}</p>
                    </div>
                    <Badge variant="outline">{signer.role}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">Ready to Send</p>
                  <p className="text-sm text-muted-foreground">
                    Document will be locked after sending
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
