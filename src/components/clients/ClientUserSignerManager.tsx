import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, PenTool, UserPlus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ClientUser {
  id: string;
  user_id: string;
  can_sign_documents: boolean;
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
}

interface AvailableUser {
  id: string;
  email: string;
  full_name: string | null;
}

interface Props {
  clientId: string;
}

export function ClientUserSignerManager({ clientId }: Props) {
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [userToRemove, setUserToRemove] = useState<ClientUser | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const fetchData = async () => {
    try {
      // Fetch client_users
      const { data: clientUsersData, error: clientUsersError } = await supabase
        .from('client_users')
        .select('id, user_id, can_sign_documents')
        .eq('client_id', clientId);

      if (clientUsersError) throw clientUsersError;

      const assignedUserIds = (clientUsersData || []).map(cu => cu.user_id);

      // Fetch profiles for assigned users
      let merged: ClientUser[] = [];
      if (clientUsersData && clientUsersData.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', assignedUserIds);

        if (profilesError) throw profilesError;

        merged = clientUsersData.map(cu => ({
          ...cu,
          profiles: profilesData?.find(p => p.id === cu.user_id) || null
        }));
      }

      setClientUsers(merged);

      // Fetch all users with 'client' role who are not already assigned to this client
      const { data: clientRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'client');

      if (rolesError) throw rolesError;

      const clientRoleUserIds = (clientRoles || []).map(r => r.user_id);
      const unassignedUserIds = clientRoleUserIds.filter(id => !assignedUserIds.includes(id));

      if (unassignedUserIds.length > 0) {
        const { data: unassignedProfiles, error: unassignedError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', unassignedUserIds);

        if (unassignedError) throw unassignedError;
        setAvailableUsers(unassignedProfiles || []);
      } else {
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load portal users'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addUserToClient = async () => {
    if (!selectedUserId) return;
    
    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('client_users')
        .insert({ client_id: clientId, user_id: selectedUserId, can_sign_documents: true });

      if (error) throw error;

      toast({ title: 'User added to client portal' });
      setSelectedUserId('');
      await fetchData();
    } catch (error) {
      console.error('Error adding user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add user to client'
      });
    } finally {
      setIsAdding(false);
    }
  };

  const removeUserFromClient = async () => {
    if (!userToRemove) return;
    
    setIsRemoving(true);
    try {
      const { error } = await supabase
        .from('client_users')
        .delete()
        .eq('id', userToRemove.id);

      if (error) throw error;

      toast({ title: 'User removed from client portal' });
      setUserToRemove(null);
      await fetchData();
    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove user from client'
      });
    } finally {
      setIsRemoving(false);
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
            <User className="h-5 w-5" />
            Portal Users & Signers
          </CardTitle>
          <CardDescription>Manage users attached to this client</CardDescription>
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
    <>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Portal Users & Signers
          </CardTitle>
          <CardDescription>
            Add users to this client's portal and manage their document signing permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add User Section */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-lg border border-dashed bg-muted/30">
            {availableUsers.length > 0 ? (
              <>
                <div className="flex-1">
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user to add..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email} {user.full_name && `(${user.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={addUserToClient} 
                  disabled={!selectedUserId || isAdding}
                  className="shrink-0"
                >
                  {isAdding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Add to Client
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-3 text-sm text-muted-foreground w-full">
                <UserPlus className="h-5 w-5 shrink-0" />
                <span>No available users to add. Create users with "client" role in the Users page first.</span>
              </div>
            )}
          </div>

          {/* Existing Users List */}
          {clientUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No portal users assigned</p>
              <p className="text-sm">
                {availableUsers.length > 0 
                  ? 'Select a user above to add them to this client' 
                  : 'Create users with the "client" role first, then add them here'}
              </p>
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
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setUserToRemove(clientUser)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User from Client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {userToRemove?.profiles?.full_name || userToRemove?.profiles?.email} from this client's portal. 
              They will no longer be able to access this client's documents or sign on their behalf.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeUserFromClient}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
