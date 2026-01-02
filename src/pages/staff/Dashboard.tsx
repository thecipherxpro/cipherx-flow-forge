import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Building2, 
  FolderKanban, 
  FileText, 
  Plus,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalClients: number;
  activeProjects: number;
  draftDocuments: number;
}

const StaffDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeProjects: 0,
    draftDocuments: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [clientsRes, projectsRes, documentsRes] = await Promise.all([
          supabase.from('clients').select('id', { count: 'exact', head: true }),
          supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('documents').select('id', { count: 'exact', head: true }).eq('status', 'draft')
        ]);

        setStats({
          totalClients: clientsRes.count || 0,
          activeProjects: projectsRes.count || 0,
          draftDocuments: documentsRes.count || 0
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
      title: 'Clients',
      value: stats.totalClients,
      icon: Building2,
      href: '/staff/clients',
      color: 'text-blue-500'
    },
    {
      title: 'Active Projects',
      value: stats.activeProjects,
      icon: FolderKanban,
      href: '/staff/projects',
      color: 'text-green-500'
    },
    {
      title: 'Draft Documents',
      value: stats.draftDocuments,
      icon: FileText,
      href: '/staff/documents',
      color: 'text-amber-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.user_metadata?.full_name || 'Staff Member'}
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common tasks and operations</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/staff/documents">
              <FileText className="h-4 w-4 mr-2" />
              View Documents
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/staff/projects">
              <FolderKanban className="h-4 w-4 mr-2" />
              View Projects
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffDashboard;
