import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, User, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ClientUser {
  user_id: string;
  can_sign_documents: boolean;
  profiles: {
    email: string;
    full_name: string | null;
  };
}

interface Props {
  clientId: string;
  selectedSignerId: string | null;
  onSignerChange: (userId: string | null) => void;
}

export function ClientSignerSelect({ clientId, selectedSignerId, onSignerChange }: Props) {
  const { data: clientUsers, isLoading } = useQuery({
    queryKey: ['client-users', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_users')
        .select('user_id, can_sign_documents, profiles(email, full_name)')
        .eq('client_id', clientId);
      if (error) throw error;
      return data as unknown as ClientUser[];
    },
    enabled: !!clientId,
  });

  const selectedUser = clientUsers?.find(u => u.user_id === selectedSignerId);

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Authorized Signer
        </CardTitle>
        <CardDescription>
          Select a portal user who can sign documents on behalf of this client
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : clientUsers && clientUsers.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document Signer</Label>
              <Select
                value={selectedSignerId || ''}
                onValueChange={(value) => onSignerChange(value || null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a user as signer..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No signer selected</SelectItem>
                  {clientUsers.map((cu) => (
                    <SelectItem key={cu.user_id} value={cu.user_id}>
                      <div className="flex items-center gap-2">
                        <span>{cu.profiles?.full_name || 'No name'}</span>
                        <span className="text-muted-foreground text-xs">
                          ({cu.profiles?.email})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUser && (
              <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {selectedUser.profiles?.full_name || 'No name'}
                    </p>
                    <Badge variant="secondary" className="text-xs">Signer</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedUser.profiles?.email}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No portal users assigned to this client yet. Add users in the Users section.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
