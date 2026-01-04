import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, FolderKanban, Eye, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
  service_type: string;
  status: string;
  start_date: string | null;
  target_end_date: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  on_hold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
};

const serviceTypeLabels: Record<string, string> = {
  website_pwa_build: 'Website + PWA Build',
  website_only: 'Website Only',
  pwa_only: 'PWA Only',
  cybersecurity: 'Cybersecurity Services',
  graphic_design: 'Graphic Design'
};

const PortalProjects = () => {
  const { clientId } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchProjects = async () => {
      if (!clientId) return;

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [clientId]);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-muted-foreground">View your active and completed projects</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Your Projects</CardTitle>
              <CardDescription>{projects.length} total projects</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-8">
              <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' ? 'No projects match your filters' : 'No projects yet'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredProjects.map((project) => (
                  <div key={project.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <Badge variant="outline" className="mt-1">
                          {serviceTypeLabels[project.service_type] || project.service_type}
                        </Badge>
                      </div>
                      <Badge className={statusColors[project.status] || ''}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {project.start_date && project.target_end_date
                          ? `${format(new Date(project.start_date), 'MMM d')} - ${format(new Date(project.target_end_date), 'MMM d, yyyy')}`
                          : 'Timeline TBD'}
                      </span>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/portal/projects/${project.id}`}>
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
                      <TableHead>Project</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timeline</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {serviceTypeLabels[project.service_type] || project.service_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[project.status] || ''}>
                            {project.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {project.start_date && project.target_end_date ? (
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(project.start_date), 'MMM d')} - {format(new Date(project.target_end_date), 'MMM d, yyyy')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/portal/projects/${project.id}`}>
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

export default PortalProjects;
