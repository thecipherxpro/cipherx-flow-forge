import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, PenTool } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClientUser {
  id: string;
  user_id: string;
  can_sign_documents: boolean;
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
}

interface Props {
  clientId: string;
}

export function ClientUserSignerManager({ clientId }: Props) {
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchClientUsers();
  }, [clientId]);

  const fetchClientUsers = async () => {
    try {
      // First get client_users
      const { data: clientUsersData, error: clientUsersError } = await supabase
        .from('client_users')
        .select('id, user_id, can_sign_documents')
        .eq('client_id', clientId);

      if (clientUsersError) throw clientUsersError;

      if (!clientUsersData || clientUsersData.length === 0) {
        setClientUsers([]);
        return;
      }

      // Then get profiles for those users
      const userIds = clientUsersData.map(cu => cu.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Merge the data
      const merged: ClientUser[] = clientUsersData.map(cu => ({
        ...cu,
        profiles: profilesData?.find(p => p.id === cu.user_id) || null
      }));

      setClientUsers(merged);
    } catch (error) {
      console.error('Error fetching client users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load portal users'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSignerStatus = async (clientUser: ClientUser) => {
    setUpdatingIds(prev => new Set(prev).add(clientUser.id));
    
    try {
      const newStatus = !clientUser.can_sign_documents;
      
      const { error } = await supabase
        .from('client_users')
        .update({ can_sign_documents: newStatus })
        .eq('id', clientUser.id);

      if (error) throw error;

      setClientUsers(prev =>
        prev.map(cu =>
          cu.id === clientUser.id
            ? { ...cu, can_sign_documents: newStatus }
            : cu
        )
      );

      toast({
        title: newStatus ? 'Signer enabled' : 'Signer disabled',
        description: `${clientUser.profiles?.full_name || clientUser.profiles?.email} ${newStatus ? 'can now' : 'can no longer'} sign documents`
      });
    } catch (error) {
      console.error('Error updating signer status:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update signer status'
      });
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(clientUser.id);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Document Signers
          </CardTitle>
          <CardDescription>Manage which portal users can sign documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="h-5 w-5" />
          Document Signers
        </CardTitle>
        <CardDescription>
          Enable signing permissions for portal users who are authorized to sign documents on behalf of this client
        </CardDescription>
      </CardHeader>
      <CardContent>
        {clientUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No portal users assigned</p>
            <p className="text-sm">Add users to this client's portal to enable signing</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clientUsers.map(clientUser => (
              <div
                key={clientUser.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {clientUser.profiles?.full_name || 'No name set'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {clientUser.profiles?.email}
                    </p>
                  </div>
                  {clientUser.can_sign_documents && (
                    <Badge variant="secondary" className="ml-2">
                      <PenTool className="h-3 w-3 mr-1" />
                      Signer
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor={`signer-${clientUser.id}`} className="text-sm text-muted-foreground">
                    Can Sign
                  </Label>
                  {updatingIds.has(clientUser.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Switch
                      id={`signer-${clientUser.id}`}
                      checked={clientUser.can_sign_documents}
                      onCheckedChange={() => toggleSignerStatus(clientUser)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
