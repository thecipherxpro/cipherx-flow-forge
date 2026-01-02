import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  FolderKanban, 
  FileText, 
  Users, 
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalClients: number;
  activeProjects: number;
  pendingDocuments: number;
  pendingUsers: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeProjects: 0,
    pendingDocuments: 0,
    pendingUsers: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [clientsRes, projectsRes, documentsRes, usersRes] = await Promise.all([
          supabase.from('clients').select('id', { count: 'exact', head: true }),
          supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('documents').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
          supabase.from('profiles').select('id', { count: 'exact', head: true })
        ]);

        // Count users without roles (pending approval)
        const { count: totalProfiles } = usersRes;
        const { count: usersWithRoles } = await supabase
          .from('user_roles')
          .select('user_id', { count: 'exact', head: true });

        setStats({
          totalClients: clientsRes.count || 0,
          activeProjects: projectsRes.count || 0,
          pendingDocuments: documentsRes.count || 0,
          pendingUsers: (totalProfiles || 0) - (usersWithRoles || 0)
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Clients',
      value: stats.totalClients,
      icon: Building2,
      description: 'Active client accounts',
      href: '/admin/clients',
      color: 'text-blue-500'
    },
    {
      title: 'Active Projects',
      value: stats.activeProjects,
      icon: FolderKanban,
      description: 'Projects in progress',
      href: '/admin/projects',
      color: 'text-green-500'
    },
    {
      title: 'Pending Documents',
      value: stats.pendingDocuments,
      icon: FileText,
      description: 'Awaiting signature',
      href: '/admin/documents',
      color: 'text-amber-500'
    },
    {
      title: 'Pending Users',
      value: stats.pendingUsers,
      icon: Users,
      description: 'Awaiting role assignment',
      href: '/admin/users',
      color: 'text-purple-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to CipherX Solutions Admin Portal
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/admin/clients/new">
              <Plus className="h-4 w-4 mr-2" />
              New Client
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/documents/new">
              <FileText className="h-4 w-4 mr-2" />
              New Document
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
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

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks and operations</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/admin/documents/new?type=proposal">
                <FileText className="h-4 w-4 mr-2" />
                Create Proposal
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/admin/documents/new?type=contract">
                <FileText className="h-4 w-4 mr-2" />
                Create Contract
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/admin/documents/new?type=sla">
                <FileText className="h-4 w-4 mr-2" />
                Create SLA
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/admin/projects/new">
                <FolderKanban className="h-4 w-4 mr-2" />
                New Project
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Status</CardTitle>
            <CardDescription>Platform health and notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">All systems operational</p>
                <p className="text-xs text-muted-foreground">Last checked: just now</p>
              </div>
            </div>
            
            {stats.pendingUsers > 0 && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/20">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{stats.pendingUsers} user(s) pending approval</p>
                  <Link to="/admin/users" className="text-xs text-primary hover:underline">
                    Review now
                  </Link>
                </div>
              </div>
            )}

            {stats.pendingDocuments > 0 && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{stats.pendingDocuments} document(s) awaiting signature</p>
                  <Link to="/admin/documents?status=sent" className="text-xs text-primary hover:underline">
                    View documents
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
