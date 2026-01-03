import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit, Building2, Calendar, User, FolderKanban, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  service_type: string;
  status: string;
  start_date: string | null;
  target_end_date: string | null;
  actual_end_date: string | null;
  created_at: string;
  clients: {
    id: string;
    company_name: string;
  } | null;
  assigned_profile: {
    full_name: string | null;
    email: string;
  } | null;
}

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
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

const AdminProjectView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProjectData();
    }
  }, [id]);

  const fetchProjectData = async () => {
    try {
      const [projectRes, milestonesRes] = await Promise.all([
        supabase
          .from('projects')
          .select('*, clients(id, company_name)')
          .eq('id', id)
          .single(),
        supabase
          .from('project_milestones')
          .select('*')
          .eq('project_id', id)
          .order('sort_order')
      ]);

      if (projectRes.error) throw projectRes.error;

      // Fetch assigned user profile if exists
      let assignedProfile = null;
      if (projectRes.data.assigned_to) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', projectRes.data.assigned_to)
          .single();
        assignedProfile = profile;
      }
      
      setProject({ ...projectRes.data, assigned_profile: assignedProfile });
      setMilestones(milestonesRes.data || []);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load project'
      });
      navigate('/admin/projects');
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

  if (!project) return null;

  const completedMilestones = milestones.filter(m => m.completed_at).length;
  const progressPercentage = milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/projects')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{project.name}</h1>
              <Badge className={statusColors[project.status] || ''}>
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {serviceTypeLabels[project.service_type] || project.service_type}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to={`/admin/projects/${id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Link>
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Project Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="whitespace-pre-wrap">{project.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Service Type</p>
              <Badge variant="outline">{serviceTypeLabels[project.service_type] || project.service_type}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={statusColors[project.status] || ''}>
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Client & Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Client & Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Client</p>
              {project.clients ? (
                <Link 
                  to={`/admin/clients/${project.clients.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {project.clients.company_name}
                </Link>
              ) : (
                <p className="text-muted-foreground">No client assigned</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Assigned To</p>
              {project.assigned_profile ? (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{project.assigned_profile.full_name || project.assigned_profile.email}</span>
                </div>
              ) : (
                <p className="text-muted-foreground">Unassigned</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">
                  {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Target End Date</p>
                <p className="font-medium">
                  {project.target_end_date ? format(new Date(project.target_end_date), 'MMM d, yyyy') : 'Not set'}
                </p>
              </div>
            </div>
            {project.actual_end_date && (
              <div>
                <p className="text-sm text-muted-foreground">Actual End Date</p>
                <p className="font-medium">
                  {format(new Date(project.actual_end_date), 'MMM d, yyyy')}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {format(new Date(project.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Milestones
            </CardTitle>
            <CardDescription>
              {completedMilestones} of {milestones.length} completed ({Math.round(progressPercentage)}%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {milestones.length === 0 ? (
              <p className="text-muted-foreground">No milestones defined</p>
            ) : (
              <div className="space-y-3">
                {milestones.map((milestone) => (
                  <div 
                    key={milestone.id} 
                    className={`flex items-start gap-3 p-3 rounded-lg ${milestone.completed_at ? 'bg-green-50 dark:bg-green-900/10' : 'bg-muted/50'}`}
                  >
                    {milestone.completed_at ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${milestone.completed_at ? 'line-through text-muted-foreground' : ''}`}>
                        {milestone.name}
                      </p>
                      {milestone.description && (
                        <p className="text-sm text-muted-foreground">{milestone.description}</p>
                      )}
                      {milestone.due_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Due: {format(new Date(milestone.due_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminProjectView;
