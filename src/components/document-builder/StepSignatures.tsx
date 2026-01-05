import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Button } from '@/components/ui/button';
import { CalendarIcon, Building2, User, Loader2 } from 'lucide-react';
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

interface ClientUser {
  user_id: string;
  can_sign_documents: boolean;
  profiles: {
    email: string;
    full_name: string | null;
  };
}

interface Props {
  signers: Signer[];
  onChange: (signers: Signer[]) => void;
  client: Client | null;
  expiresAt: Date | null;
  onExpiresAtChange: (date: Date | null) => void;
}

export function StepSignatures({ signers, onChange, client, expiresAt, onExpiresAtChange }: Props) {
  const { data: companySigners, isLoading: loadingCompanySigners } = useQuery({
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

  const { data: clientUsers, isLoading: loadingClientUsers } = useQuery({
    queryKey: ['client-users-for-signing', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data, error } = await supabase
        .from('client_users')
        .select('user_id, can_sign_documents, profiles(email, full_name)')
        .eq('client_id', client.id);
      if (error) throw error;
      return data as unknown as ClientUser[];
    },
    enabled: !!client?.id,
  });

  const cipherxSigner = signers.find(s => s.type === 'cipherx');
  const clientSigner = signers.find(s => s.type === 'client');

  const handleCipherXSignerChange = (signerId: string) => {
    const signer = companySigners?.find(s => s.id === signerId);
    if (!signer) {
      // Remove cipherx signer
      onChange(signers.filter(s => s.type !== 'cipherx'));
      return;
    }

    const newSigner: Signer = {
      id: signer.id,
      name: signer.full_name,
      email: signer.email,
      role: 'CipherX Representative',
      position: signer.position,
      isRequired: true,
      type: 'cipherx',
    };

    // Replace or add cipherx signer
    const otherSigners = signers.filter(s => s.type !== 'cipherx');
    onChange([...otherSigners, newSigner]);
  };

  const handleClientSignerChange = (userId: string) => {
    const user = clientUsers?.find(u => u.user_id === userId);
    if (!user) {
      // Remove client signer
      onChange(signers.filter(s => s.type !== 'client'));
      return;
    }

    const newSigner: Signer = {
      id: `client_user_${user.user_id}`,
      name: user.profiles?.full_name || user.profiles?.email || 'Client User',
      email: user.profiles?.email || '',
      role: 'Client Representative',
      isRequired: true,
      type: 'client',
    };

    // Replace or add client signer
    const otherSigners = signers.filter(s => s.type !== 'client');
    onChange([...otherSigners, newSigner]);
  };

  const clientAddress = client ? [
    client.address_line1,
    client.city,
    client.province,
    client.postal_code,
  ].filter(Boolean).join(', ') : '';

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        {/* CipherX Signer */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Company Signer</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Select one authorized company signer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {loadingCompanySigners ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : companySigners && companySigners.length > 0 ? (
              <>
                <Select
                  value={cipherxSigner?.id || ''}
                  onValueChange={handleCipherXSignerChange}
                >
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="Select company signer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companySigners.map((signer) => (
                      <SelectItem key={signer.id} value={signer.id}>
                        <div className="flex items-center gap-2">
                          <span className="truncate">{signer.full_name}</span>
                          <span className="text-muted-foreground text-xs">- {signer.position}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {cipherxSigner && (
                  <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg bg-muted/30">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{cipherxSigner.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{cipherxSigner.email}</p>
                      {cipherxSigner.position && (
                        <Badge variant="secondary" className="mt-1 text-[10px] sm:text-xs">{cipherxSigner.position}</Badge>
                      )}
                    </div>
                  </div>
                )}
              </>
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
              Select portal user from {client?.company_name || 'selected client'}
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

                {loadingClientUsers ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : clientUsers && clientUsers.length > 0 ? (
                  <>
                    <Select
                      value={clientSigner?.id?.replace('client_user_', '') || ''}
                      onValueChange={handleClientSignerChange}
                    >
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Select client signer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientUsers.map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            <div className="flex items-center gap-2">
                              <span className="truncate">{user.profiles?.full_name || 'No name'}</span>
                              <span className="text-muted-foreground text-xs">({user.profiles?.email})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {clientSigner && (
                      <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg bg-muted/30">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">{clientSigner.name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{clientSigner.email}</p>
                          <Badge variant="outline" className="mt-1 text-[10px] sm:text-xs">{clientSigner.role}</Badge>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs sm:text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 sm:p-3 rounded-lg">
                    No portal users assigned to this client. Add users in the Users section.
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
