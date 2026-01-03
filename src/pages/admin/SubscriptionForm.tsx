import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

interface Client {
  id: string;
  company_name: string;
}

const billingCycles = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' }
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' }
];

const AdminSubscriptionForm = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: searchParams.get('client') || '',
    is_third_party: false,
    provider_name: '',
    amount: '',
    billing_cycle: 'monthly',
    status: 'active',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    next_billing_date: '',
    auto_renew: true,
    notes: ''
  });

  useEffect(() => {
    fetchClients();
    if (isEditing) {
      fetchSubscription();
    }
  }, [id]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, company_name')
      .order('company_name');
    setClients(data || []);
  };

  const fetchSubscription = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setFormData({
        name: data.name || '',
        description: data.description || '',
        client_id: data.client_id || '',
        is_third_party: data.is_third_party || false,
        provider_name: data.provider_name || '',
        amount: data.amount?.toString() || '',
        billing_cycle: data.billing_cycle || 'monthly',
        status: data.status || 'active',
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        next_billing_date: data.next_billing_date || '',
        auto_renew: data.auto_renew ?? true,
        notes: data.notes || ''
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load subscription'
      });
      navigate('/admin/subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.client_id || !formData.amount) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Name, client, and amount are required'
      });
      return;
    }

    setIsSaving(true);
    try {
      const subscriptionData = {
        name: formData.name,
        description: formData.description || null,
        client_id: formData.client_id,
        is_third_party: formData.is_third_party,
        provider_name: formData.is_third_party ? formData.provider_name : null,
        amount: parseFloat(formData.amount),
        billing_cycle: formData.billing_cycle as 'monthly' | 'quarterly' | 'annually',
        status: formData.status as 'active' | 'pending' | 'cancelled' | 'expired',
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        next_billing_date: formData.next_billing_date || null,
        auto_renew: formData.auto_renew,
        notes: formData.notes || null
      };

      if (isEditing) {
        const { error } = await supabase
          .from('subscriptions')
          .update(subscriptionData)
          .eq('id', id);
        
        if (error) throw error;
        toast({ title: 'Subscription updated successfully' });
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert([{ ...subscriptionData, created_by: user?.id }]);
        
        if (error) throw error;
        toast({ title: 'Subscription created successfully' });
      }
      
      navigate('/admin/subscriptions');
    } catch (error) {
      console.error('Error saving subscription:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save subscription'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/subscriptions')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Subscription' : 'New Subscription'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update subscription information' : 'Create a new subscription'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Service Information</CardTitle>
              <CardDescription>Basic details about the subscription</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Website Hosting"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client_id">Client *</Label>
                <Select 
                  value={formData.client_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                >
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
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2 flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Switch
                  id="is_third_party"
                  checked={formData.is_third_party}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_third_party: checked }))}
                />
                <div>
                  <Label htmlFor="is_third_party" className="cursor-pointer">Third-party service</Label>
                  <p className="text-sm text-muted-foreground">Enable if this is a service provided by another company</p>
                </div>
              </div>
              
              {formData.is_third_party && (
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="provider_name">Provider Name</Label>
                  <Input
                    id="provider_name"
                    value={formData.provider_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, provider_name: e.target.value }))}
                    placeholder="e.g., Cloudflare, Google Workspace"
                  />
                </div>
              )}
              
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Service description..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>Payment and billing details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (CAD) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="99.99"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="billing_cycle">Billing Cycle</Label>
                <Select 
                  value={formData.billing_cycle} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, billing_cycle: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {billingCycles.map(cycle => (
                      <SelectItem key={cycle.value} value={cycle.value}>
                        {cycle.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-4">
                <Switch
                  id="auto_renew"
                  checked={formData.auto_renew}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_renew: checked }))}
                />
                <Label htmlFor="auto_renew" className="cursor-pointer">Auto-renew</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dates</CardTitle>
              <CardDescription>Subscription timeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="next_billing_date">Next Billing Date</Label>
                <Input
                  id="next_billing_date"
                  type="date"
                  value={formData.next_billing_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, next_billing_date: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Additional information</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes..."
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/subscriptions')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Update Subscription' : 'Create Subscription'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminSubscriptionForm;
