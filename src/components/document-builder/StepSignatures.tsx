import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, CalendarIcon, Building2, User, Mail, Loader2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Signer {
  id: string;
  name: string;
  email: string;
  role: string;
  position?: string;
  isRequired: boolean;
  type: 'cipherx' | 'client';
}

interface Client {
  id: string;
  company_name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  address_line1?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
}

interface CompanySigner {
  id: string;
  full_name: string;
  email: string;
  position: string;
  is_active: boolean;
}

interface ClientContact {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  is_primary: boolean | null;
}

interface Props {
  signers: Signer[];
  onChange: (signers: Signer[]) => void;
  client: Client | null;
  expiresAt: Date | null;
  onExpiresAtChange: (date: Date | null) => void;
}

export function StepSignatures({ signers, onChange, client, expiresAt, onExpiresAtChange }: Props) {
  const [selectedClientContact, setSelectedClientContact] = useState<string>('');

  const { data: companySigners, isLoading } = useQuery({
    queryKey: ['company-signers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_signers')
        .select('*')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data as CompanySigner[];
    },
  });

  const { data: clientContacts } = useQuery({
    queryKey: ['client-contacts', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data, error } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('client_id', client.id)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return data as ClientContact[];
    },
    enabled: !!client?.id,
  });

  useEffect(() => {
    if (client && client.contact_name && client.contact_email) {
      const existingClientSigner = signers.find(s => s.type === 'client');
      if (!existingClientSigner) {
        const clientSigner: Signer = {
          id: `client_${client.id}`,
          name: client.contact_name,
          email: client.contact_email,
          role: 'Client Representative',
          isRequired: true,
          type: 'client',
        };
        onChange([...signers, clientSigner]);
      }
    }
  }, [client]);

  const addCipherXSigner = (signerId: string) => {
    const signer = companySigners?.find(s => s.id === signerId);
    if (!signer) return;

    if (signers.some(s => s.id === signerId)) return;

    const newSigner: Signer = {
      id: signer.id,
      name: signer.full_name,
      email: signer.email,
      role: 'CipherX Representative',
      position: signer.position,
      isRequired: true,
      type: 'cipherx',
    };
    onChange([...signers, newSigner]);
  };

  const addClientContact = () => {
    if (!selectedClientContact) return;
    
    const contact = clientContacts?.find(c => c.id === selectedClientContact);
    if (!contact) return;

    // Check if already added
    if (signers.some(s => s.email === contact.email && s.type === 'client')) return;

    const newSigner: Signer = {
      id: `client_contact_${contact.id}`,
      name: contact.full_name,
      email: contact.email,
      role: contact.job_title || 'Client Representative',
      position: contact.job_title || undefined,
      isRequired: true,
      type: 'client',
    };
    onChange([...signers, newSigner]);
    setSelectedClientContact('');
  };

  const addPrimaryClientContact = () => {
    if (!client?.contact_name || !client?.contact_email) return;
    
    // Check if already added
    if (signers.some(s => s.email === client.contact_email && s.type === 'client')) return;

    const newSigner: Signer = {
      id: `client_primary_${client.id}`,
      name: client.contact_name,
      email: client.contact_email,
      role: 'Client Representative',
      isRequired: true,
      type: 'client',
    };
    onChange([...signers, newSigner]);
  };

  const removeSigner = (id: string) => {
    onChange(signers.filter(s => s.id !== id));
  };

  const cipherxSigners = signers.filter(s => s.type === 'cipherx');
  const clientSignersList = signers.filter(s => s.type === 'client');

  const clientAddress = client ? [
    client.address_line1,
    client.city,
    client.province,
    client.postal_code,
  ].filter(Boolean).join(', ') : '';

  // Filter out contacts that are already added as signers
  const availableContacts = clientContacts?.filter(
    contact => !signers.some(s => s.email === contact.email && s.type === 'client')
  ) || [];

  const canAddPrimaryContact = client?.contact_name && client?.contact_email && 
    !signers.some(s => s.email === client.contact_email && s.type === 'client');

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        {/* CipherX Signers */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">CipherX Signers</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Select authorized company signers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {cipherxSigners.map((signer) => (
              <div key={signer.id} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg bg-muted/30">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base truncate">{signer.name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{signer.email}</p>
                  {signer.position && (
                    <Badge variant="secondary" className="mt-1 text-[10px] sm:text-xs">{signer.position}</Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0" onClick={() => removeSigner(signer.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : companySigners && companySigners.length > 0 ? (
              <Select onValueChange={addCipherXSigner}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Add CipherX Signer..." />
                </SelectTrigger>
                <SelectContent>
                  {companySigners
                    .filter(cs => !signers.some(s => s.id === cs.id))
                    .map((signer) => (
                      <SelectItem key={signer.id} value={signer.id}>
                        <div className="flex items-center gap-2">
                          <span className="truncate">{signer.full_name}</span>
                          <span className="text-muted-foreground text-xs">- {signer.position}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
                No company signers available. Add signers in Settings → Signers.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Client Signers */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Client Signers</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Add signers from {client?.company_name || 'selected client'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {client ? (
              <div className="space-y-3 sm:space-y-4">
                {/* Client Company Info */}
                <div className="p-3 sm:p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">{client.company_name}</p>
                      {clientAddress && (
                        <p className="text-xs text-muted-foreground truncate">{clientAddress}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Added Client Signers */}
                {clientSignersList.map((signer) => (
                  <div key={signer.id} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg bg-muted/30">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{signer.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{signer.email}</p>
                      <Badge variant="outline" className="mt-1 text-[10px] sm:text-xs">{signer.role}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0" onClick={() => removeSigner(signer.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {/* Add from contacts dropdown */}
                {availableContacts.length > 0 && (
                  <div className="flex gap-2">
                    <Select value={selectedClientContact} onValueChange={setSelectedClientContact}>
                      <SelectTrigger className="flex-1 text-sm">
                        <SelectValue placeholder="Select contact..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableContacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            <div className="flex items-center gap-2">
                              <span className="truncate">{contact.full_name}</span>
                              {contact.job_title && (
                                <span className="text-muted-foreground text-xs">- {contact.job_title}</span>
                              )}
                              {contact.is_primary && (
                                <Badge variant="secondary" className="text-[10px]">Primary</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={addClientContact} disabled={!selectedClientContact}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Add primary contact button */}
                {canAddPrimaryContact && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={addPrimaryClientContact}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add {client.contact_name} (Primary)
                  </Button>
                )}

                {clientSignersList.length === 0 && !canAddPrimaryContact && availableContacts.length === 0 && (
                  <p className="text-xs sm:text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 sm:p-3 rounded-lg">
                    No client contacts available. Please add contacts to the client record.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <Building2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-30" />
                <p className="text-sm">No client selected</p>
                <p className="text-xs sm:text-sm">Go back to Step 1 to select a client</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Document Expiration</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Set when this document expires if not signed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full sm:w-[280px] justify-start text-left font-normal text-sm', !expiresAt && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? format(expiresAt, 'PPP') : 'Select expiration date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={expiresAt || undefined}
                  onSelect={(date) => onExpiresAtChange(date || null)}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {expiresAt && (
              <Button variant="ghost" onClick={() => onExpiresAtChange(null)} className="w-full sm:w-auto">
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
