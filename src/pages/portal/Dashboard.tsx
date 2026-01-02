import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FolderKanban, 
  FileText, 
  CreditCard, 
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  activeProjects: number;
  pendingDocuments: number;
  activeSubscriptions: number;
}

const PortalDashboard = () => {
  const { user, clientId } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    pendingDocuments: 0,
    activeSubscriptions: 0
  });
  const [clientName, setClientName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!clientId) return;

      try {
        const [clientRes, projectsRes, documentsRes, subscriptionsRes] = await Promise.all([
          supabase.from('clients').select('company_name').eq('id', clientId).single(),
          supabase.from('projects').select('id', { count: 'exact', head: true })
            .eq('client_id', clientId).eq('status', 'active'),
          supabase.from('documents').select('id', { count: 'exact', head: true })
            .eq('client_id', clientId).eq('status', 'sent'),
          supabase.from('subscriptions').select('id', { count: 'exact', head: true })
            .eq('client_id', clientId).eq('status', 'active')
        ]);

        if (clientRes.data) {
          setClientName(clientRes.data.company_name);
        }

        setStats({
          activeProjects: projectsRes.count || 0,
          pendingDocuments: documentsRes.count || 0,
          activeSubscriptions: subscriptionsRes.count || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clientId]);

  const statCards = [
    {
      title: 'Active Projects',
      value: stats.activeProjects,
      icon: FolderKanban,
      href: '/portal/projects',
      color: 'text-green-500'
    },
    {
      title: 'Pending Signatures',
      value: stats.pendingDocuments,
      icon: FileText,
      href: '/portal/documents',
      color: 'text-amber-500'
    },
    {
      title: 'Active Subscriptions',
      value: stats.activeSubscriptions,
      icon: CreditCard,
      href: '/portal/subscriptions',
      color: 'text-blue-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
        <p className="text-muted-foreground">
          {clientName ? `${clientName} Client Portal` : 'Client Portal'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stat.value}
              </div>
              <Link 
                to={stat.href} 
                className="text-xs text-primary hover:underline inline-flex items-center mt-2"
              >
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notifications</CardTitle>
          <CardDescription>Recent updates and action items</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.pendingDocuments > 0 ? (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  You have {stats.pendingDocuments} document(s) awaiting your signature
                </p>
                <Link to="/portal/documents" className="text-xs text-primary hover:underline">
                  Review and sign
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs text-muted-foreground">No pending actions required</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/portal/projects">
              <FolderKanban className="h-4 w-4 mr-2" />
              View Projects
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/portal/documents">
              <FileText className="h-4 w-4 mr-2" />
              View Documents
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/portal/subscriptions">
              <CreditCard className="h-4 w-4 mr-2" />
              View Subscriptions
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalDashboard;
