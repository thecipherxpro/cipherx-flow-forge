import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, KeyRound, Building2 } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
}

interface Client {
  id: string;
  company_name: string;
}

interface UserEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Profile | null;
  currentRole: string | null;
  onSave: () => void;
}

export function UserEditSheet({ open, onOpenChange, user, currentRole, onSave }: UserEditSheetProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    role: '',
    client_id: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        role: currentRole || '',
        client_id: ''
      });
      fetchClients();
      fetchUserClient(user.id);
    }
  }, [user, currentRole]);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, company_name')
      .order('company_name');
    
    if (!error && data) {
      setClients(data);
    }
  };

  const fetchUserClient = async (userId: string) => {
    const { data, error } = await supabase
      .from('client_users')
      .select('client_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!error && data) {
      setCurrentClientId(data.client_id);
      setFormData(prev => ({ ...prev, client_id: data.client_id }));
    } else {
      setCurrentClientId(null);
      setFormData(prev => ({ ...prev, client_id: '' }));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update role
      if (formData.role) {
        const existingRole = currentRole;
        if (existingRole) {
          await supabase
            .from('user_roles')
            .update({ role: formData.role as 'admin' | 'staff' | 'client', is_approved: true })
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('user_roles')
            .insert({ user_id: user.id, role: formData.role as 'admin' | 'staff' | 'client', is_approved: true });
        }
      }

      // Handle client assignment (only for client role)
      if (formData.role === 'client') {
        const newClientId = formData.client_id || null;
        
        if (currentClientId !== newClientId) {
          // Remove from old client if exists
          if (currentClientId) {
            await supabase
              .from('client_users')
              .delete()
              .eq('user_id', user.id)
              .eq('client_id', currentClientId);
          }
          
          // Add to new client if selected
          if (newClientId) {
            await supabase
              .from('client_users')
              .insert({ 
                user_id: user.id, 
                client_id: newClientId,
                can_sign_documents: true 
              });
          }
        }
      } else {
        // If not client role, remove any client assignments
        if (currentClientId) {
          await supabase
            .from('client_users')
            .delete()
            .eq('user_id', user.id);
        }
      }

      toast({ title: 'User updated successfully' });
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user) return;
    setIsSendingReset(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth`
      });

      if (error) throw error;

      toast({ 
        title: 'Password reset email sent',
        description: `Reset link sent to ${user.email}`
      });
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send password reset email'
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const showClientSelect = formData.role === 'client';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit User</SheetTitle>
          <SheetDescription>
            Update user information and role assignment
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{user?.email}</span>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="John Doe"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>Role</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
            >
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

          {/* Associated Client (only for client role) */}
          {showClientSelect && (
            <div className="space-y-2">
              <Label>Associated Client</Label>
              <Select 
                value={formData.client_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
              >
                <SelectTrigger>
                  <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select a client company..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No client assigned</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Assign this user to a client company for portal access
              </p>
            </div>
          )}

          {/* Password Reset */}
          <div className="space-y-2">
            <Label>Password</Label>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleSendPasswordReset}
              disabled={isSendingReset}
              className="w-full"
            >
              {isSendingReset ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4 mr-2" />
              )}
              Send Password Reset Email
            </Button>
          </div>
        </div>

        <SheetFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
