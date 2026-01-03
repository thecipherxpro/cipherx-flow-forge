import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, FolderKanban, CreditCard, FileText, CheckCircle, ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

interface Client {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
}

interface Project {
  id: string;
  name: string;
  status: string;
  service_type: string;
}

interface Subscription {
  id: string;
  name: string;
  status: string;
  amount: number;
  billing_cycle: string;
}

interface Document {
  id: string;
  title: string;
  status: string;
  document_type: string;
}

interface ClientOnboardingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Profile | null;
  onComplete: () => void;
}

const STEPS = [
  { id: 1, title: 'Select Client', icon: Building2 },
  { id: 2, title: 'Assign Projects', icon: FolderKanban },
  { id: 3, title: 'Assign Subscriptions', icon: CreditCard },
  { id: 4, title: 'Assign Documents', icon: FileText },
  { id: 5, title: 'Review & Complete', icon: CheckCircle }
];

export function ClientOnboardingSheet({ open, onOpenChange, user, onComplete }: ClientOnboardingSheetProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Data
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  
  // Selections
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<string[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [approveUser, setApproveUser] = useState(true);
  
  // Search
  const [clientSearch, setClientSearch] = useState('');

  useEffect(() => {
    if (open) {
      fetchClients();
      resetState();
    }
  }, [open]);

  useEffect(() => {
    if (selectedClient) {
      fetchClientData(selectedClient.id);
    }
  }, [selectedClient]);

  const resetState = () => {
    setCurrentStep(1);
    setSelectedClient(null);
    setSelectedProjects([]);
    setSelectedSubscriptions([]);
    setSelectedDocuments([]);
    setApproveUser(true);
    setClientSearch('');
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, company_name, contact_name, contact_email, phone')
      .order('company_name');
    setClients(data || []);
  };

  const fetchClientData = async (clientId: string) => {
    setIsLoading(true);
    try {
      const [projectsRes, subscriptionsRes, documentsRes] = await Promise.all([
        supabase.from('projects').select('id, name, status, service_type').eq('client_id', clientId),
        supabase.from('subscriptions').select('id, name, status, amount, billing_cycle').eq('client_id', clientId),
        supabase.from('documents').select('id, title, status, document_type').eq('client_id', clientId)
      ]);

      setProjects(projectsRes.data || []);
      setSubscriptions(subscriptionsRes.data || []);
      setDocuments(documentsRes.data || []);
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!user || !selectedClient) return;
    setIsSaving(true);

    try {
      // Create/update user role as client with is_approved flag
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingRole) {
        await supabase
          .from('user_roles')
          .update({ role: 'client', is_approved: approveUser })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_roles')
          .insert({ user_id: user.id, role: 'client', is_approved: approveUser });
      }

      // Create client_users entry
      await supabase.from('client_users').delete().eq('user_id', user.id);
      await supabase.from('client_users').insert({ 
        user_id: user.id, 
        client_id: selectedClient.id,
        can_sign_documents: true
      });

      toast({ 
        title: 'Onboarding complete',
        description: approveUser 
          ? `${user.full_name || user.email} can now access the client portal`
          : `${user.full_name || user.email} is set up but pending approval`
      });
      
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to complete onboarding'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.company_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.contact_name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.contact_email?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const canProceed = () => {
    if (currentStep === 1) return selectedClient !== null;
    return true;
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>Client Onboarding</SheetTitle>
          <SheetDescription>
            Set up {user?.full_name || user?.email} as a client user
          </SheetDescription>
        </SheetHeader>

        {/* Progress */}
        <div className="py-4">
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between mt-2">
            {STEPS.map((step) => (
              <div 
                key={step.id} 
                className={`flex flex-col items-center ${currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <step.icon className="h-4 w-4" />
                <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 pr-4">
          {/* Step 1: Select Client */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="space-y-2">
                {filteredClients.map((client) => (
                  <Card 
                    key={client.id}
                    className={`cursor-pointer transition-colors ${selectedClient?.id === client.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setSelectedClient(client)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{client.company_name}</p>
                          {client.contact_name && (
                            <p className="text-sm text-muted-foreground">{client.contact_name}</p>
                          )}
                          {client.contact_email && (
                            <p className="text-sm text-muted-foreground">{client.contact_email}</p>
                          )}
                        </div>
                        {selectedClient?.id === client.id && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredClients.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No clients found. Create a client first.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Assign Projects */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : projects.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No projects found for this client. You can skip this step.
                </p>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <Card key={project.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedProjects.includes(project.id)}
                          onCheckedChange={(checked) => {
                            setSelectedProjects(prev => 
                              checked 
                                ? [...prev, project.id]
                                : prev.filter(id => id !== project.id)
                            );
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{project.name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{project.service_type.replace(/_/g, ' ')}</Badge>
                            <Badge variant="secondary" className="text-xs">{project.status}</Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Assign Subscriptions */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : subscriptions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No subscriptions found for this client. You can skip this step.
                </p>
              ) : (
                <div className="space-y-2">
                  {subscriptions.map((sub) => (
                    <Card key={sub.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedSubscriptions.includes(sub.id)}
                          onCheckedChange={(checked) => {
                            setSelectedSubscriptions(prev => 
                              checked 
                                ? [...prev, sub.id]
                                : prev.filter(id => id !== sub.id)
                            );
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{sub.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ${sub.amount}/{sub.billing_cycle === 'monthly' ? 'mo' : sub.billing_cycle === 'quarterly' ? 'qtr' : 'yr'}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">{sub.status}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Assign Documents */}
          {currentStep === 4 && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No documents found for this client. You can skip this step.
                </p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedDocuments.includes(doc.id)}
                          onCheckedChange={(checked) => {
                            setSelectedDocuments(prev => 
                              checked 
                                ? [...prev, doc.id]
                                : prev.filter(id => id !== doc.id)
                            );
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{doc.title}</p>
                          <Badge variant="outline" className="text-xs mt-1">{doc.document_type}</Badge>
                        </div>
                        <Badge variant="secondary" className="text-xs">{doc.status}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review & Complete */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">User</Label>
                    <p className="font-medium">{user?.full_name || 'No name'}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  
                  <div>
                    <Label className="text-muted-foreground text-xs">Assigned Client</Label>
                    <p className="font-medium">{selectedClient?.company_name}</p>
                  </div>
                  
                  <div>
                    <Label className="text-muted-foreground text-xs">Projects</Label>
                    <p>{selectedProjects.length} selected</p>
                  </div>
                  
                  <div>
                    <Label className="text-muted-foreground text-xs">Subscriptions</Label>
                    <p>{selectedSubscriptions.length} selected</p>
                  </div>
                  
                  <div>
                    <Label className="text-muted-foreground text-xs">Documents</Label>
                    <p>{selectedDocuments.length} selected</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="approve"
                      checked={approveUser}
                      onCheckedChange={(checked) => setApproveUser(checked === true)}
                    />
                    <div>
                      <Label htmlFor="approve" className="font-medium cursor-pointer">
                        Approve user for login access
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        User will be able to access the client portal immediately
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>

        <SheetFooter className="flex-row justify-between gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => currentStep > 1 ? setCurrentStep(prev => prev - 1) : onOpenChange(false)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep > 1 ? 'Back' : 'Cancel'}
          </Button>
          
          {currentStep < STEPS.length ? (
            <Button 
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed()}
            >
              {currentStep === 1 ? 'Continue' : 'Skip / Next'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Onboarding
                </>
              )}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
