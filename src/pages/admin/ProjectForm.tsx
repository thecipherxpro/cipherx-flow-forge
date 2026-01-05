import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

interface Client {
  id: string;
  company_name: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

const serviceTypes = [
  { value: 'website_pwa_build', label: 'Website + PWA Build' },
  { value: 'website_only', label: 'Website Only' },
  { value: 'pwa_only', label: 'PWA Only' },
  { value: 'cybersecurity', label: 'Cybersecurity Services' },
  { value: 'graphic_design', label: 'Graphic Design' }
];

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' }
];

const AdminProjectForm = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: searchParams.get('client') || '',
    service_type: 'website_only',
    status: 'draft',
    start_date: '',
    target_end_date: '',
    assigned_to: ''
  });

  useEffect(() => {
    fetchClients();
    fetchStaff();
    if (isEditing) {
      fetchProject();
    }
  }, [id]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, company_name')
      .order('company_name');
    setClients(data || []);
  };

  const fetchStaff = async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'staff']);
    
    if (roles && roles.length > 0) {
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      setStaff(profiles || []);
    }
  };

  const fetchProject = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setFormData({
        name: data.name || '',
        description: data.description || '',
        client_id: data.client_id || '',
        service_type: data.service_type || 'website_only',
        status: data.status || 'draft',
        start_date: data.start_date || '',
        target_end_date: data.target_end_date || '',
        assigned_to: data.assigned_to || ''
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.client_id) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Project name and client are required'
      });
      return;
    }

    setIsSaving(true);
    try {
      const projectData = {
        name: formData.name,
        description: formData.description || null,
        client_id: formData.client_id,
        service_type: formData.service_type as 'website_pwa_build' | 'website_only' | 'pwa_only' | 'cybersecurity' | 'graphic_design',
        status: formData.status as 'draft' | 'active' | 'on_hold' | 'completed',
        start_date: formData.start_date || null,
        target_end_date: formData.target_end_date || null,
        assigned_to: formData.assigned_to || null
      };

      if (isEditing) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', id);
        
        if (error) throw error;
        toast({ title: 'Project updated successfully' });
      } else {
        const { error } = await supabase
          .from('projects')
          .insert([{ ...projectData, created_by: user?.id }]);
        
        if (error) throw error;
        toast({ title: 'Project created successfully' });
      }
      
      navigate('/admin/projects');
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save project'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/projects')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Project' : 'New Project'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update project information' : 'Create a new project'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>Basic details about the project</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Website Redesign"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client_id">Client *</Label>
                <Select 
                  value={formData.client_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="service_type">Service Type</Label>
                <Select 
                  value={formData.service_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, service_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Assigned To</Label>
                <Select 
                  value={formData.assigned_to || '__unassigned__'} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value === '__unassigned__' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unassigned__">Unassigned</SelectItem>
                    {staff.map(person => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.full_name || person.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Project description..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>Project schedule and deadlines</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="target_end_date">Target End Date</Label>
                <Input
                  id="target_end_date"
                  type="date"
                  value={formData.target_end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_end_date: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/projects')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Update Project' : 'Create Project'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminProjectForm;
