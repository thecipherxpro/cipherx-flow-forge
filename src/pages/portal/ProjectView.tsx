import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  assigned_to: string | null;
  clients?: {
    id: string;
    company_name: string;
  } | null;
  assigned_profile?: {
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

const PortalProjectView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clientId } = useAuth();
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
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

      setProject({ 
        ...projectRes.data, 
        assigned_profile: assignedProfile,
        clients: null // Portal users don't need client info displayed
      });
      setMilestones(milestonesRes.data || []);
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

  return (
    <ProjectViewContent
      project={project}
      milestones={milestones}
      onBack={() => navigate('/portal/projects')}
      showEditButton={false}
      showAddTask={false}
    />
  );
};

export default PortalProjectView;
