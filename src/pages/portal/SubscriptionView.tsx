import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CreditCard, Calendar, DollarSign, RefreshCw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface SubscriptionData {
  id: string;
  name: string;
  description: string | null;
  is_third_party: boolean;
  provider_name: string | null;
  amount: number;
  billing_cycle: string;
  status: string;
  start_date: string;
  end_date: string | null;
  next_billing_date: string | null;
  auto_renew: boolean;
  notes: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  expired: 'bg-muted text-muted-foreground'
};

const billingCycleLabels: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually'
};

const PortalSubscriptionView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clientId } = useAuth();
  
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id && clientId) {
      fetchSubscription();
    }
  }, [id, clientId]);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .eq('client_id', clientId)
        .single();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      navigate('/portal/subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!subscription) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/portal/subscriptions')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{subscription.name}</h1>
            <Badge className={statusColors[subscription.status] || ''}>
              {subscription.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {subscription.is_third_party ? 'Third-party service' : 'CipherX service'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Service Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Service Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Service Name</p>
              <p className="font-medium">{subscription.name}</p>
            </div>
            {subscription.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="whitespace-pre-wrap">{subscription.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Provider</p>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {subscription.is_third_party ? subscription.provider_name || 'Unknown' : 'CipherX'}
                </span>
                {subscription.is_third_party && (
                  <Badge variant="outline" className="text-xs">3rd Party</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Billing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold">{formatCurrency(subscription.amount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Billing Cycle</p>
              <p className="font-medium">{billingCycleLabels[subscription.billing_cycle] || subscription.billing_cycle}</p>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${subscription.auto_renew ? 'text-green-600' : 'text-muted-foreground'}`} />
              <span className="text-sm">
                {subscription.auto_renew ? 'Auto-renewal enabled' : 'Auto-renewal disabled'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">{format(new Date(subscription.start_date), 'MMM d, yyyy')}</p>
              </div>
              {subscription.next_billing_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Next Billing Date</p>
                  <p className="font-medium">{format(new Date(subscription.next_billing_date), 'MMM d, yyyy')}</p>
                </div>
              )}
              {subscription.end_date && (
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">{format(new Date(subscription.end_date), 'MMM d, yyyy')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes (if any) */}
        {subscription.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{subscription.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PortalSubscriptionView;
