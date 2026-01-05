import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, User, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ClientContact {
  id: string;
  client_id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  phone: string | null;
  is_primary: boolean | null;
}

interface Props {
  clientId: string;
}

export function ClientSignersManager({ clientId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newSigner, setNewSigner] = useState({
    full_name: '',
    email: '',
    job_title: '',
  });

  const { data: signers, isLoading } = useQuery({
    queryKey: ['client-signers', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('client_id', clientId)
        .order('is_primary', { ascending: false })
        .order('full_name');
      if (error) throw error;
      return data as ClientContact[];
    },
    enabled: !!clientId,
  });

  const addMutation = useMutation({
    mutationFn: async (signer: { full_name: string; email: string; job_title: string }) => {
      const { error } = await supabase
        .from('client_contacts')
        .insert({
          client_id: clientId,
          full_name: signer.full_name,
          email: signer.email,
          job_title: signer.job_title || null,
          is_primary: false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-signers', clientId] });
      toast({ title: 'Signer added successfully' });
      setIsAdding(false);
      setNewSigner({ full_name: '', email: '', job_title: '' });
    },
    onError: (error) => {
      console.error('Error adding signer:', error);
      toast({ variant: 'destructive', title: 'Failed to add signer' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (signerId: string) => {
      const { error } = await supabase
        .from('client_contacts')
        .delete()
        .eq('id', signerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-signers', clientId] });
      toast({ title: 'Signer removed' });
    },
    onError: (error) => {
      console.error('Error removing signer:', error);
      toast({ variant: 'destructive', title: 'Failed to remove signer' });
    },
  });

  const handleAdd = () => {
    if (!newSigner.full_name.trim() || !newSigner.email.trim()) {
      toast({ variant: 'destructive', title: 'Name and email are required' });
      return;
    }
    addMutation.mutate(newSigner);
  };

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Authorized Signers</CardTitle>
        <CardDescription>
          Manage signers who can sign contracts and documents on behalf of this client
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Existing Signers List */}
            {signers && signers.length > 0 ? (
              <div className="space-y-3">
                {signers.map((signer) => (
                  <div
                    key={signer.id}
                    className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{signer.full_name}</p>
                        {signer.is_primary && (
                          <Badge variant="secondary" className="text-xs">Primary</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{signer.email}</p>
                      {signer.job_title && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {signer.job_title}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 flex-shrink-0"
                      onClick={() => deleteMutation.mutate(signer.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No signers added yet. Add signers who can sign documents for this client.
              </p>
            )}

            {/* Add New Signer Form */}
            {isAdding ? (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="signer_name">Full Name *</Label>
                    <Input
                      id="signer_name"
                      value={newSigner.full_name}
                      onChange={(e) => setNewSigner((prev) => ({ ...prev, full_name: e.target.value }))}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signer_email">Email *</Label>
                    <Input
                      id="signer_email"
                      type="email"
                      value={newSigner.email}
                      onChange={(e) => setNewSigner((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="john@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signer_position">Position</Label>
                    <Input
                      id="signer_position"
                      value={newSigner.job_title}
                      onChange={(e) => setNewSigner((prev) => ({ ...prev, job_title: e.target.value }))}
                      placeholder="CEO, Director, etc."
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAdding(false);
                      setNewSigner({ full_name: '', email: '', job_title: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAdd}
                    disabled={addMutation.isPending}
                  >
                    {addMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Signer'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Signer
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
