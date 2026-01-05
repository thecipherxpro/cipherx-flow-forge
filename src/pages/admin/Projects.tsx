import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Plus, Search, MoreHorizontal, FolderKanban, Eye, Edit, Trash2, SlidersHorizontal, Calendar, Globe, Shield, Palette, Smartphone, Monitor, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import ProjectCard from '@/components/projects/ProjectCard';

interface Project {
  id: string;
  name: string;
  service_type: string;
  status: string;
  start_date: string | null;
  target_end_date: string | null;
  created_at: string;
  clients: {
    company_name: string;
  } | null;
}

interface ProjectWithMilestones extends Project {
  milestones: { total: number; completed: number };
}

const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'draft', label: 'Draft' },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  active: { label: 'Active', className: 'bg-emerald-500/20 text-emerald-400' },
  on_hold: { label: 'In Review', className: 'bg-amber-500/20 text-amber-400' },
  completed: { label: 'Completed', className: 'bg-primary/20 text-primary' }
};

const serviceIconConfig: Record<string, { icon: typeof Globe; bgColor: string; iconColor: string }> = {
  website_pwa_build: { icon: Monitor, bgColor: 'bg-violet-500/20', iconColor: 'text-violet-400' },
  website_only: { icon: Globe, bgColor: 'bg-blue-500/20', iconColor: 'text-blue-400' },
  pwa_only: { icon: Smartphone, bgColor: 'bg-cyan-500/20', iconColor: 'text-cyan-400' },
  cybersecurity: { icon: Shield, bgColor: 'bg-rose-500/20', iconColor: 'text-rose-400' },
  graphic_design: { icon: Palette, bgColor: 'bg-orange-500/20', iconColor: 'text-orange-400' }
};

const serviceTypeLabels: Record<string, string> = {
  website_pwa_build: 'Website + PWA',
  website_only: 'Website',
  pwa_only: 'PWA',
  cybersecurity: 'Cybersecurity',
  graphic_design: 'Design'
};

const AdminProjects = () => {
  const [projects, setProjects] = useState<ProjectWithMilestones[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchProjects = async () => {
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*, clients(company_name)')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch milestones for all projects
      const projectIds = projectsData?.map(p => p.id) || [];
      const { data: milestonesData } = await supabase
        .from('project_milestones')
        .select('project_id, completed_at')
        .in('project_id', projectIds);

      // Calculate milestone stats per project
      const milestoneStats: Record<string, { total: number; completed: number }> = {};
      milestonesData?.forEach(m => {
        if (!milestoneStats[m.project_id]) {
          milestoneStats[m.project_id] = { total: 0, completed: 0 };
        }
        milestoneStats[m.project_id].total++;
        if (m.completed_at) milestoneStats[m.project_id].completed++;
      });

      const projectsWithMilestones: ProjectWithMilestones[] = (projectsData || []).map(p => ({
        ...p,
        milestones: milestoneStats[p.id] || { total: 0, completed: 0 }
      }));

      setProjects(projectsWithMilestones);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load projects'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.clients?.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      
      toast({ title: 'Project deleted successfully' });
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete project'
      });
    }
  };

  const getProgress = (milestones: { total: number; completed: number }) => {
    if (milestones.total === 0) return 0;
    return Math.round((milestones.completed / milestones.total) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage client projects and deliverables
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card/50 border-border/50"
          />
        </div>
        <Button variant="outline" size="icon" className="flex-shrink-0 bg-card/50 border-border/50">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {statusFilters.map((filter) => (
          <Button
            key={filter.value}
            variant={statusFilter === filter.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(filter.value)}
            className={`flex-shrink-0 ${
              statusFilter === filter.value 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-card/50 border-border/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          <span className="text-sm text-primary cursor-pointer hover:underline">
            {filteredProjects.length} projects
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all' ? 'No projects match your filters' : 'No projects yet'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button asChild className="mt-4">
                <Link to="/admin/projects/new">Create your first project</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  milestones={project.milestones}
                  linkPrefix="/admin/projects"
                />
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <div className="rounded-lg border border-border/50 bg-card/30 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Project</TableHead>
                      <TableHead className="text-muted-foreground">Client</TableHead>
                      <TableHead className="text-muted-foreground">Service</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Progress</TableHead>
                      <TableHead className="text-muted-foreground">Due Date</TableHead>
                      <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => {
                      const status = statusConfig[project.status] || statusConfig.draft;
                      const serviceIcon = serviceIconConfig[project.service_type] || serviceIconConfig.website_only;
                      const Icon = serviceIcon.icon;
                      const progress = getProgress(project.milestones);

                      return (
                        <TableRow key={project.id} className="border-border/50 hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg ${serviceIcon.bgColor} flex items-center justify-center`}>
                                <Icon className={`h-4 w-4 ${serviceIcon.iconColor}`} />
                              </div>
                              <span className="font-medium">{project.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {project.clients?.company_name || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {serviceTypeLabels[project.service_type] || project.service_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${status.className} text-xs`}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3 min-w-[120px]">
                              <Progress value={progress} className="h-2 flex-1" />
                              <span className="text-sm text-muted-foreground w-10">{progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {project.target_end_date 
                              ? format(new Date(project.target_end_date), 'MMM d, yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/admin/projects/${project.id}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to={`/admin/projects/${project.id}/edit`}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDelete(project.id, project.name)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminProjects;
