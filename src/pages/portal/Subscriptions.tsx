import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, CreditCard, Eye, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Subscription {
  id: string;
  name: string;
  description: string | null;
  is_third_party: boolean;
  provider_name: string | null;
  amount: number;
  billing_cycle: string;
  status: string;
  start_date: string;
  next_billing_date: string | null;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  expired: 'bg-muted text-muted-foreground'
};

const PortalSubscriptions = () => {
  const { clientId } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!clientId) return;

      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSubscriptions(data || []);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptions();
  }, [clientId]);

  const filteredSubscriptions = subscriptions.filter(sub =>
    sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.provider_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatAmount = (amount: number, cycle: string) => {
    const formatted = new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
    
    return `${formatted}/${cycle === 'monthly' ? 'mo' : cycle === 'quarterly' ? 'qtr' : 'yr'}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground">View your active subscriptions and billing</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Your Subscriptions</CardTitle>
              <CardDescription>{subscriptions.length} total subscriptions</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subscriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No subscriptions match your search' : 'No subscriptions yet'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredSubscriptions.map((sub) => (
                  <div key={sub.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{sub.name}</p>
                          {sub.is_third_party && (
                            <Badge variant="outline" className="text-xs">3rd Party</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {sub.is_third_party ? sub.provider_name || 'Unknown' : 'CipherX'}
                        </p>
                      </div>
                      <Badge className={statusColors[sub.status] || ''}>
                        {sub.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{formatAmount(sub.amount, sub.billing_cycle)}</p>
                        {sub.next_billing_date && (
                          <p className="text-xs text-muted-foreground">
                            Next billing: {format(new Date(sub.next_billing_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/portal/subscriptions/${sub.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Next Billing</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {sub.name}
                            {sub.is_third_party && (
                              <Badge variant="outline" className="text-xs">3rd Party</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {sub.is_third_party ? sub.provider_name || '-' : 'CipherX'}
                        </TableCell>
                        <TableCell>{formatAmount(sub.amount, sub.billing_cycle)}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[sub.status] || ''}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sub.next_billing_date ? (
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(sub.next_billing_date), 'MMM d, yyyy')}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/portal/subscriptions/${sub.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalSubscriptions;
