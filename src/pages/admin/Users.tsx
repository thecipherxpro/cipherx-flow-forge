import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Users, UserCog, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'staff' | 'client';
}

interface Client {
  id: string;
  company_name: string;
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  staff: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  client: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
};

const AdminUsers = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<Map<string, string>>(new Map());
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [profilesRes, rolesRes, clientsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('clients').select('id, company_name').order('company_name')
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (clientsRes.error) throw clientsRes.error;

      setProfiles(profilesRes.data || []);
      setClients(clientsRes.data || []);
      
      const rolesMap = new Map<string, string>();
      (rolesRes.data || []).forEach((r: UserRole) => {
        rolesMap.set(r.user_id, r.role);
      });
      setUserRoles(rolesMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load users'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProfiles = profiles.filter(profile =>
    profile.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAssignDialog = (user: Profile) => {
    setSelectedUser(user);
    setSelectedRole(userRoles.get(user.id) || '');
    setSelectedClient('');
    setDialogOpen(true);
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) return;

    setIsSaving(true);
    try {
      // Check if user already has a role
      const existingRole = userRoles.get(selectedUser.id);
      
      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: selectedRole as 'admin' | 'staff' | 'client' })
          .eq('user_id', selectedUser.id);
        
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.id, role: selectedRole as 'admin' | 'staff' | 'client' });
        
        if (error) throw error;
      }

      // If client role, also create client_users entry
      if (selectedRole === 'client' && selectedClient) {
        // First remove any existing client_users entries
        await supabase
          .from('client_users')
          .delete()
          .eq('user_id', selectedUser.id);
        
        // Then insert the new one
        const { error } = await supabase
          .from('client_users')
          .insert({ user_id: selectedUser.id, client_id: selectedClient });
        
        if (error) throw error;
      }

      toast({ title: 'Role assigned successfully' });
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error assigning role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to assign role'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts and role assignments
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>{profiles.length} registered users</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No users match your search' : 'No users yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((profile) => {
                    const role = userRoles.get(profile.id);
                    return (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">
                          {profile.full_name || 'No name'}
                        </TableCell>
                        <TableCell>{profile.email}</TableCell>
                        <TableCell>
                          {role ? (
                            <Badge className={roleColors[role] || ''}>
                              {role}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(profile.created_at), 'MMM d, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openAssignDialog(profile)}
                          >
                            <UserCog className="h-4 w-4 mr-2" />
                            {role ? 'Change Role' : 'Assign Role'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User Role</DialogTitle>
            <DialogDescription>
              Assign a role to {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (Full access)</SelectItem>
                  <SelectItem value="staff">Staff (Limited admin)</SelectItem>
                  <SelectItem value="client">Client (Portal access)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {selectedRole === 'client' && (
              <div className="space-y-2">
                <Label>Associated Client</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {clients.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No clients available. Create a client first.
                  </p>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignRole} 
              disabled={!selectedRole || (selectedRole === 'client' && !selectedClient) || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Assign Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
