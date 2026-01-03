import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit, Building2, User, MapPin, Phone, Mail, Globe, FolderKanban, CreditCard, FileText, Users, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ClientData {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  notes: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  service_type: string;
}

interface Subscription {
  id: string;
  name: string;
  status: string;
  amount: number;
  billing_cycle: string;
}

interface Document {
  id: string;
  title: string;
  status: string;
  document_type: string;
}

interface ClientUser {
  user_id: string;
  profiles: {
    email: string;
    full_name: string | null;
  };
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  on_hold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  signed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  expired: 'bg-muted text-muted-foreground'
};

const AdminClientView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [client, setClient] = useState<ClientData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchClientData();
    }
  }, [id]);

  const fetchClientData = async () => {
    try {
      const [clientRes, projectsRes, subscriptionsRes, documentsRes, usersRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('projects').select('id, name, status, service_type').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('id, name, status, amount, billing_cycle').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('documents').select('id, title, status, document_type').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('client_users').select('user_id, profiles(email, full_name)').eq('client_id', id)
      ]);

      if (clientRes.error) throw clientRes.error;
      
      setClient(clientRes.data);
      setProjects(projectsRes.data || []);
      setSubscriptions(subscriptionsRes.data || []);
      setDocuments(documentsRes.data || []);
      setClientUsers((usersRes.data as unknown as ClientUser[]) || []);
    } catch (error) {
      console.error('Error fetching client:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load client'
      });
      navigate('/admin/clients');
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

  if (!client) return null;

  const fullAddress = [
    client.address_line1,
    client.address_line2,
    [client.city, client.province].filter(Boolean).join(', '),
    client.postal_code,
    client.country
  ].filter(Boolean).join('\n');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/clients')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{client.company_name}</h1>
            <p className="text-sm text-muted-foreground">
              Client since {format(new Date(client.created_at), 'MMMM yyyy')}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to={`/admin/clients/${id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Client
          </Link>
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Company Name</p>
              <p className="font-medium">{client.company_name}</p>
            </div>
            {client.industry && (
              <div>
                <p className="text-sm text-muted-foreground">Industry</p>
                <Badge variant="secondary">{client.industry}</Badge>
              </div>
            )}
            {client.website && (
              <div>
                <p className="text-sm text-muted-foreground">Website</p>
                <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  {client.website}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Primary Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Primary Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.contact_name && (
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{client.contact_name}</p>
              </div>
            )}
            {client.contact_email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <a href={`mailto:${client.contact_email}`} className="text-primary hover:underline flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {client.contact_email}
                </a>
              </div>
            )}
            {client.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <a href={`tel:${client.phone}`} className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {client.phone}
                </a>
              </div>
            )}
            {!client.contact_name && !client.contact_email && !client.phone && (
              <p className="text-muted-foreground">No contact information</p>
            )}
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fullAddress ? (
              <p className="whitespace-pre-line">{fullAddress}</p>
            ) : (
              <p className="text-muted-foreground">No address on file</p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {client.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{client.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Associated Data */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              Projects
            </CardTitle>
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/admin/projects/new?client=${id}`}>
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects</p>
            ) : (
              <div className="space-y-2">
                {projects.slice(0, 5).map((project) => (
                  <Link 
                    key={project.id} 
                    to={`/admin/projects/${project.id}`}
                    className="block p-2 rounded hover:bg-muted"
                  >
                    <p className="text-sm font-medium truncate">{project.name}</p>
                    <Badge className={`text-xs ${statusColors[project.status] || ''}`}>
                      {project.status.replace('_', ' ')}
                    </Badge>
                  </Link>
                ))}
                {projects.length > 5 && (
                  <p className="text-xs text-muted-foreground">+{projects.length - 5} more</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscriptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Subscriptions
            </CardTitle>
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/admin/subscriptions/new?client=${id}`}>
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {subscriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subscriptions</p>
            ) : (
              <div className="space-y-2">
                {subscriptions.slice(0, 5).map((sub) => (
                  <Link 
                    key={sub.id} 
                    to={`/admin/subscriptions/${sub.id}`}
                    className="block p-2 rounded hover:bg-muted"
                  >
                    <p className="text-sm font-medium truncate">{sub.name}</p>
                    <Badge className={`text-xs ${statusColors[sub.status] || ''}`}>
                      {sub.status}
                    </Badge>
                  </Link>
                ))}
                {subscriptions.length > 5 && (
                  <p className="text-xs text-muted-foreground">+{subscriptions.length - 5} more</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </CardTitle>
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/admin/documents/new?client=${id}`}>
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents</p>
            ) : (
              <div className="space-y-2">
                {documents.slice(0, 5).map((doc) => (
                  <Link 
                    key={doc.id} 
                    to={`/admin/documents/${doc.id}`}
                    className="block p-2 rounded hover:bg-muted"
                  >
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <Badge className={`text-xs ${statusColors[doc.status] || ''}`}>
                      {doc.status}
                    </Badge>
                  </Link>
                ))}
                {documents.length > 5 && (
                  <p className="text-xs text-muted-foreground">+{documents.length - 5} more</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Portal Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users assigned</p>
            ) : (
              <div className="space-y-2">
                {clientUsers.map((cu) => (
                  <div key={cu.user_id} className="p-2">
                    <p className="text-sm font-medium truncate">{cu.profiles?.full_name || 'No name'}</p>
                    <p className="text-xs text-muted-foreground truncate">{cu.profiles?.email}</p>
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

export default AdminClientView;
