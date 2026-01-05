import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import ProjectViewContent from '@/components/projects/ProjectViewContent';

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

  const toggleMilestoneComplete = async (milestone: Milestone) => {
    const isCompleting = !milestone.completed_at;
    const newCompletedAt = isCompleting ? new Date().toISOString() : null;
    
    // Optimistic update
    setMilestones(prev => prev.map(m => 
      m.id === milestone.id ? { ...m, completed_at: newCompletedAt } : m
    ));

    try {
      const { error } = await supabase
        .from('project_milestones')
        .update({ completed_at: newCompletedAt })
        .eq('id', milestone.id);

      if (error) throw error;

      toast({
        title: isCompleting ? 'Task completed' : 'Task reopened',
        description: milestone.name
      });
    } catch (error) {
      console.error('Error updating milestone:', error);
      // Revert on error
      setMilestones(prev => prev.map(m => 
        m.id === milestone.id ? { ...m, completed_at: milestone.completed_at } : m
      ));
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update task'
      });
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

  return (
    <ProjectViewContent
      project={project}
      milestones={milestones}
      onBack={() => navigate('/admin/projects')}
      showEditButton={true}
      showAddTask={true}
      editPath={`/admin/projects/${id}/edit`}
      clientLinkPath="/admin/clients"
      onToggleMilestone={toggleMilestoneComplete}
    />
  );
};

export default AdminProjectView;
