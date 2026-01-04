import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Shield, Lock, FileCheck, Scale, Plus, Pencil, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ServiceType = Database['public']['Enums']['service_type'];

interface ComplianceItem {
  id: string;
  title: string;
  description: string;
  content: string;
  icon: string;
  service_types: string[];
  is_always_applicable: boolean;
  is_active: boolean;
  sort_order: number;
}

interface Props {
  selectedCompliances: string[];
  onSelectedChange: (ids: string[]) => void;
  serviceType: ServiceType | null;
}

const iconMap: Record<string, React.ReactNode> = {
  Shield: <Shield className="h-5 w-5" />,
  Lock: <Lock className="h-5 w-5" />,
  FileCheck: <FileCheck className="h-5 w-5" />,
  Scale: <Scale className="h-5 w-5" />,
};

export function StepCompliance({ selectedCompliances, onSelectedChange, serviceType }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ComplianceItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    icon: 'Shield',
  });

  const { data: complianceItems, isLoading } = useQuery({
    queryKey: ['compliance-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as ComplianceItem[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('compliance_items').insert([{
        ...data,
        service_types: [],
        is_always_applicable: false,
        is_active: true,
        sort_order: (complianceItems?.length || 0) + 1,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-items'] });
      toast({ title: 'Compliance item added' });
      handleCloseDialog();
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to add compliance item' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from('compliance_items').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-items'] });
      toast({ title: 'Compliance item updated' });
      handleCloseDialog();
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to update compliance item' });
    },
  });

  // Filter applicable items based on service type
  const applicableItems = complianceItems?.filter(item => 
    item.is_always_applicable || 
    (serviceType && item.service_types?.includes(serviceType)) ||
    item.service_types?.length === 0
  ) || [];

  const toggleSelection = (id: string) => {
    if (selectedCompliances.includes(id)) {
      onSelectedChange(selectedCompliances.filter(c => c !== id));
    } else {
      onSelectedChange([...selectedCompliances, id]);
    }
  };

  const selectAll = () => {
    onSelectedChange(applicableItems.map(item => item.id));
  };

  const handleOpenDialog = (item?: ComplianceItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        description: item.description,
        content: item.content,
        icon: item.icon,
      });
    } else {
      setEditingItem(null);
      setFormData({ title: '', description: '', content: '', icon: 'Shield' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({ title: '', description: '', content: '', icon: 'Shield' });
  };

  const handleSave = () => {
    if (!formData.title || !formData.description) {
      toast({ variant: 'destructive', title: 'Please fill in required fields' });
      return;
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select Compliance Requirements</CardTitle>
              <CardDescription>
                Choose which compliance items to include in this document
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-1" />
                Add New
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {applicableItems.map((item) => {
              const isSelected = selectedCompliances.includes(item.id);
              return (
                <div 
                  key={item.id} 
                  className={`relative flex items-start gap-3 p-4 border rounded-lg transition-colors cursor-pointer ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:bg-muted/30'
                  }`}
                  onClick={() => toggleSelection(item.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(item.id)}
                    className="mt-1"
                  />
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {iconMap[item.icon] || <Shield className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{item.title}</h4>
                      {item.is_always_applicable && (
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDialog(item);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {isSelected && (
                    <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className={selectedCompliances.length > 0 ? 'border-primary bg-primary/5' : ''}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${selectedCompliances.length > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">
                {selectedCompliances.length} compliance item{selectedCompliances.length !== 1 ? 's' : ''} selected
              </p>
              <p className="text-sm text-muted-foreground">
                Selected items will be included in the document
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Compliance Item' : 'Add New Compliance Item'}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the compliance item details.' : 'Create a new compliance requirement.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., GDPR Compliance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the compliance requirement"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Full Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Detailed compliance text to be included in documents"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
