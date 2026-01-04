import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Calendar, FolderKanban, CheckCircle, Clock, Loader2, User } from 'lucide-react';
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
  assigned_to: string | null;
}

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
}

interface AssignedProfile {
  full_name: string | null;
  email: string;
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

const PortalProjectView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clientId } = useAuth();
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [assignedProfile, setAssignedProfile] = useState<AssignedProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id && clientId) {
      fetchProjectData();
    }
  }, [id, clientId]);

  const fetchProjectData = async () => {
    try {
      const [projectRes, milestonesRes] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .eq('client_id', clientId)
          .single(),
        supabase
          .from('project_milestones')
          .select('*')
          .eq('project_id', id)
          .order('sort_order')
      ]);

      if (projectRes.error) throw projectRes.error;
      
      setProject(projectRes.data);
      setMilestones(milestonesRes.data || []);

      // Fetch assigned user profile if exists
      if (projectRes.data.assigned_to) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', projectRes.data.assigned_to)
          .single();
        if (profile) {
          setAssignedProfile(profile);
        }
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      navigate('/portal/projects');
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/portal/projects')}>
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

      {/* Progress Overview */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Project Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {completedMilestones} of {milestones.length} milestones completed ({Math.round(progressPercentage)}%)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
            {assignedProfile && (
              <div>
                <p className="text-sm text-muted-foreground">Project Manager</p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{assignedProfile.full_name || assignedProfile.email}</span>
                </div>
              </div>
            )}
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
                <p className="text-sm text-muted-foreground">Completed On</p>
                <p className="font-medium text-green-600">
                  {format(new Date(project.actual_end_date), 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Milestones
            </CardTitle>
            <CardDescription>
              Track project progress and deliverables
            </CardDescription>
          </CardHeader>
          <CardContent>
            {milestones.length === 0 ? (
              <p className="text-muted-foreground">No milestones defined yet</p>
            ) : (
              <div className="space-y-3">
                {milestones.map((milestone) => (
                  <div 
                    key={milestone.id} 
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      milestone.completed_at 
                        ? 'bg-green-50 dark:bg-green-900/10' 
                        : 'bg-muted/50'
                    }`}
                  >
                    {milestone.completed_at ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${milestone.completed_at ? 'text-green-800 dark:text-green-400' : ''}`}>
                        {milestone.name}
                      </p>
                      {milestone.description && (
                        <p className="text-sm text-muted-foreground">{milestone.description}</p>
                      )}
                      <div className="flex gap-4 mt-1">
                        {milestone.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Due: {format(new Date(milestone.due_date), 'MMM d, yyyy')}
                          </p>
                        )}
                        {milestone.completed_at && (
                          <p className="text-xs text-green-600">
                            Completed: {format(new Date(milestone.completed_at), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
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

export default PortalProjectView;
