import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CompanySigner {
  id: string;
  full_name: string;
  email: string;
  position: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const defaultSigner: Omit<CompanySigner, 'id' | 'created_at' | 'updated_at'> = {
  full_name: '',
  email: '',
  position: '',
  is_active: true,
};

export default function SignersManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSigner, setEditingSigner] = useState<CompanySigner | null>(null);
  const [formData, setFormData] = useState(defaultSigner);

  const { data: signers, isLoading } = useQuery({
    queryKey: ['company-signers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_signers')
        .select('*')
        .order('full_name');
      if (error) throw error;
      return data as CompanySigner[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof defaultSigner) => {
      const { error } = await supabase.from('company_signers').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-signers'] });
      toast({ title: 'Signer added successfully' });
      handleCloseDialog();
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to add signer' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof defaultSigner }) => {
      const { error } = await supabase.from('company_signers').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-signers'] });
      toast({ title: 'Signer updated successfully' });
      handleCloseDialog();
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to update signer' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('company_signers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-signers'] });
      toast({ title: 'Signer deleted successfully' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to delete signer' });
    },
  });

  const handleOpenDialog = (signer?: CompanySigner) => {
    if (signer) {
      setEditingSigner(signer);
      setFormData({
        full_name: signer.full_name,
        email: signer.email,
        position: signer.position,
        is_active: signer.is_active,
      });
    } else {
      setEditingSigner(null);
      setFormData(defaultSigner);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSigner(null);
    setFormData(defaultSigner);
  };

  const handleSave = () => {
    if (!formData.full_name || !formData.email || !formData.position) {
      toast({ variant: 'destructive', title: 'Please fill in all required fields' });
      return;
    }

    if (editingSigner) {
      updateMutation.mutate({ id: editingSigner.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Company Signers</CardTitle>
            <CardDescription>
              Manage authorized signers for company documents
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Signer
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : signers && signers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signers.map((signer) => (
                <TableRow key={signer.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      {signer.full_name}
                    </div>
                  </TableCell>
                  <TableCell>{signer.email}</TableCell>
                  <TableCell>{signer.position}</TableCell>
                  <TableCell>
                    <Badge variant={signer.is_active ? 'default' : 'secondary'}>
                      {signer.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(signer)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this signer?')) {
                            deleteMutation.mutate(signer.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No signers added yet</p>
            <Button variant="outline" className="mt-4" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Signer
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSigner ? 'Edit Signer' : 'Add New Signer'}
            </DialogTitle>
            <DialogDescription>
              {editingSigner
                ? 'Update the signer information below.'
                : 'Enter the details for the new company signer.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g., John Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., john@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="e.g., CEO, Director, Manager"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="is_active">Active Status</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingSigner ? 'Update' : 'Add'} Signer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
