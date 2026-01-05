import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, UserCheck, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  clientId: string;
}

interface ClientUser {
  user_id: string;
  can_sign_documents: boolean;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

export function ClientAssignedSigner({ clientId }: Props) {
  const { data: assignedUsers, isLoading } = useQuery({
    queryKey: ['client-assigned-signers', clientId],
    queryFn: async () => {
      // First get client_users
      const { data: clientUsers, error: clientUsersError } = await supabase
        .from('client_users')
        .select('user_id, can_sign_documents')
        .eq('client_id', clientId);

      if (clientUsersError) throw clientUsersError;
      if (!clientUsers || clientUsers.length === 0) return [];

      // Then get profiles for those users
      const userIds = clientUsers.map(cu => cu.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Merge the data
      return clientUsers.map(cu => {
        const profile = profiles?.find(p => p.id === cu.user_id);
        return {
          ...cu,
          profile
        };
      });
    },
    enabled: !!clientId,
  });

  const signers = assignedUsers?.filter(u => u.can_sign_documents) || [];

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Document Signer
        </CardTitle>
        <CardDescription>
          Portal users assigned to this client who can sign documents. Manage user assignments in the Users page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : signers.length > 0 ? (
          <div className="space-y-3">
            {signers.map((signer) => (
              <div 
                key={signer.user_id}
                className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {signer.profile?.full_name || 'No name'}
                    </p>
                    <Badge variant="secondary" className="text-xs">Signer</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {signer.profile?.email}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-dashed bg-muted/30">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              No portal users assigned to this client. Assign users with the "client" role to this company from the Users page.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
