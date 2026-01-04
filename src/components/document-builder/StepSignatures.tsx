import { useEffect } from 'react';
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
import { Trash2, CalendarIcon, Building2, User, Mail, Loader2 } from 'lucide-react';
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

interface Props {
  signers: Signer[];
  onChange: (signers: Signer[]) => void;
  client: Client | null;
  expiresAt: Date | null;
  onExpiresAtChange: (date: Date | null) => void;
}

export function StepSignatures({ signers, onChange, client, expiresAt, onExpiresAtChange }: Props) {
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

  const removeSigner = (id: string) => {
    onChange(signers.filter(s => s.id !== id));
  };

  const cipherxSigners = signers.filter(s => s.type === 'cipherx');
  const clientSigner = signers.find(s => s.type === 'client');

  const clientAddress = client ? [
    client.address_line1,
    client.city,
    client.province,
    client.postal_code,
  ].filter(Boolean).join(', ') : '';

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

        {/* Client Signer */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Client Signer</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Auto-populated from {client?.company_name || 'selected client'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {client ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="p-3 sm:p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">{client.company_name}</p>
                      <Badge variant="outline" className="text-[10px] sm:text-xs">Client</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    {client.contact_name && (
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{client.contact_name}</span>
                      </div>
                    )}
                    {client.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{client.contact_email}</span>
                      </div>
                    )}
                    {clientAddress && (
                      <div className="flex items-start gap-2">
                        <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{clientAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                {!client.contact_name || !client.contact_email ? (
                  <p className="text-xs sm:text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 sm:p-3 rounded-lg">
                    ⚠️ Client contact information is incomplete. Please update the client record.
                  </p>
                ) : null}
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
