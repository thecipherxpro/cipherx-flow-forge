import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Save, Send, FileText } from 'lucide-react';

// Wizard Steps
import { StepSelectClient } from '@/components/document-builder/StepSelectClient';
import { StepSelectService } from '@/components/document-builder/StepSelectService';
import { StepLoadTemplate } from '@/components/document-builder/StepLoadTemplate';
import { StepEditSections } from '@/components/document-builder/StepEditSections';
import { StepPricing } from '@/components/document-builder/StepPricing';
import { StepCompliance } from '@/components/document-builder/StepCompliance';
import { StepSignatures } from '@/components/document-builder/StepSignatures';
import { StepReviewSend } from '@/components/document-builder/StepReviewSend';

import { getTemplate, serviceTypeLabels, documentTypeLabels, type TemplateSection, type PricingItem } from '@/lib/templates/service-templates';
import type { Database, Json } from '@/integrations/supabase/types';

type DocumentType = Database['public']['Enums']['document_type'];
type ServiceType = Database['public']['Enums']['service_type'];

interface Client {
  id: string;
  company_name: string;
  address_line1: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
}

interface Signer {
  id: string;
  name: string;
  email: string;
  role: string;
  isRequired: boolean;
}

const STEPS = [
  { id: 1, name: 'Select Client', description: 'Choose the client' },
  { id: 2, name: 'Select Service', description: 'Choose service type' },
  { id: 3, name: 'Load Template', description: 'Select document type' },
  { id: 4, name: 'Edit Sections', description: 'Customize content' },
  { id: 5, name: 'Pricing', description: 'Set pricing & discounts' },
  { id: 6, name: 'Compliance', description: 'Confirm compliance' },
  { id: 7, name: 'Signatures', description: 'Setup signers' },
  { id: 8, name: 'Review & Send', description: 'Preview and send' },
];

const DocumentBuilder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType | null>(null);
  const [title, setTitle] = useState('');
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([]);
  const [discount, setDiscount] = useState({ type: 'percentage' as 'percentage' | 'fixed', value: 0 });
  const [complianceConfirmed, setComplianceConfirmed] = useState(false);
  const [signers, setSigners] = useState<Signer[]>([]);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  // Load template when service and document type are selected
  useEffect(() => {
    if (serviceType && documentType) {
      const template = getTemplate(documentType, serviceType);
      if (template) {
        setSections(template.sections);
        setPricingItems(template.defaultPricing);
        setTitle(`${documentTypeLabels[documentType]} - ${serviceTypeLabels[serviceType]}`);
      }
    }
  }, [serviceType, documentType]);

  // Replace placeholders in section content
  const processContent = (content: string): string => {
    if (!selectedClient) return content;
    
    const clientAddress = [
      selectedClient.address_line1,
      selectedClient.city,
      selectedClient.province,
      selectedClient.postal_code,
    ].filter(Boolean).join(', ');

    return content
      .replace(/\{\{CLIENT_NAME\}\}/g, selectedClient.company_name)
      .replace(/\{\{CLIENT_ADDRESS\}\}/g, clientAddress || 'Address to be provided')
      .replace(/\{\{DATE\}\}/g, new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }))
      .replace(/\{\{EXPIRY_DATE\}\}/g, expiresAt ? expiresAt.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '30 days from date above');
  };

  const calculateTotal = () => {
    const subtotal = pricingItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discountAmount = discount.type === 'percentage' 
      ? subtotal * (discount.value / 100) 
      : discount.value;
    return { subtotal, discountAmount, total: subtotal - discountAmount };
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: return !!selectedClient;
      case 2: return !!serviceType;
      case 3: return !!documentType;
      case 4: return sections.length > 0;
      case 5: return pricingItems.length > 0;
      case 6: return complianceConfirmed;
      case 7: return signers.length > 0;
      case 8: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedClient || !serviceType || !documentType) {
      toast({ variant: 'destructive', title: 'Missing required fields' });
      return;
    }

    setIsSaving(true);
    try {
      const { subtotal, discountAmount, total } = calculateTotal();
      
      const processedSections = sections.map(s => ({
        ...s,
        content: processContent(s.content),
      }));

      const { data, error } = await supabase.from('documents').insert([{
        title,
        client_id: selectedClient.id,
        document_type: documentType,
        service_type: serviceType,
        status: 'draft' as const,
        content: JSON.parse(JSON.stringify({ sections: processedSections })),
        pricing_data: JSON.parse(JSON.stringify({ items: pricingItems, discount, subtotal, discountAmount, total })),
        compliance_confirmed: complianceConfirmed,
        expires_at: expiresAt?.toISOString(),
        created_by: user?.id,
      }]).select().single();

      if (error) throw error;

      // Save signatures
      if (signers.length > 0 && data) {
        const signatureInserts = signers.map((signer, idx) => ({
          document_id: data.id,
          signer_name: signer.name,
          signer_email: signer.email,
          signer_role: signer.role,
          is_required: signer.isRequired,
          sort_order: idx,
        }));
        await supabase.from('signatures').insert(signatureInserts);
      }

      toast({ title: 'Draft saved successfully' });
      navigate('/admin/documents');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({ variant: 'destructive', title: 'Failed to save draft' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    await handleSaveDraft();
    // TODO: Implement send functionality
    toast({ title: 'Document saved. Send functionality coming soon.' });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepSelectClient selectedClient={selectedClient} onSelect={setSelectedClient} />;
      case 2:
        return <StepSelectService serviceType={serviceType} onSelect={setServiceType} />;
      case 3:
        return <StepLoadTemplate documentType={documentType} serviceType={serviceType} onSelect={setDocumentType} title={title} onTitleChange={setTitle} />;
      case 4:
        return <StepEditSections sections={sections} onChange={setSections} processContent={processContent} />;
      case 5:
        return <StepPricing items={pricingItems} onChange={setPricingItems} discount={discount} onDiscountChange={setDiscount} totals={calculateTotal()} />;
      case 6:
        return <StepCompliance confirmed={complianceConfirmed} onConfirm={setComplianceConfirmed} serviceType={serviceType} />;
      case 7:
        return <StepSignatures signers={signers} onChange={setSigners} client={selectedClient} expiresAt={expiresAt} onExpiresAtChange={setExpiresAt} />;
      case 8:
        return <StepReviewSend client={selectedClient} documentType={documentType} serviceType={serviceType} title={title} sections={sections} pricingItems={pricingItems} discount={discount} totals={calculateTotal()} signers={signers} processContent={processContent} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Document Builder</h1>
          <p className="text-sm text-muted-foreground">Create proposals, contracts, and SLAs</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/documents')} className="w-full sm:w-auto">
          Cancel
        </Button>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-4 pb-3 sm:pt-6 sm:pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Step {currentStep} of {STEPS.length}</span>
            <span className="text-sm text-muted-foreground">{Math.round((currentStep / STEPS.length) * 100)}%</span>
          </div>
          <Progress value={(currentStep / STEPS.length) * 100} className="h-2 mb-3" />
          
          {/* Mobile: Show current step name */}
          <div className="sm:hidden text-center">
            <span className="text-sm font-medium text-primary">{STEPS[currentStep - 1].name}</span>
          </div>
          
          {/* Desktop: Show all steps */}
          <div className="hidden sm:grid grid-cols-8 gap-1">
            {STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                disabled={step.id > currentStep}
                className={`text-center p-2 rounded-lg transition-colors ${
                  step.id === currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : step.id < currentStep 
                      ? 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20' 
                      : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                }`}
              >
                <div className="text-xs font-medium">{step.id}</div>
                <div className="text-[10px] truncate">{step.name.split(' ')[0]}</div>
              </button>
            ))}
          </div>
          
          {/* Mobile: Horizontal scrollable step indicators */}
          <div className="sm:hidden flex gap-1 mt-3 overflow-x-auto pb-1">
            {STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                disabled={step.id > currentStep}
                className={`flex-shrink-0 w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                  step.id === currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : step.id < currentStep 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-muted/50 text-muted-foreground/50'
                }`}
              >
                {step.id}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card className="min-h-[300px] sm:min-h-[400px]">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <FileText className="h-5 w-5" />
            {STEPS[currentStep - 1].name}
          </CardTitle>
          <CardDescription className="text-sm">{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1} className="order-2 sm:order-1">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving || !selectedClient} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          {currentStep === STEPS.length ? (
            <Button onClick={handleSend} disabled={!canProceed() || isSaving} className="w-full sm:w-auto">
              <Send className="h-4 w-4 mr-2" />
              Send for Signature
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed()} className="w-full sm:w-auto">
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentBuilder;
