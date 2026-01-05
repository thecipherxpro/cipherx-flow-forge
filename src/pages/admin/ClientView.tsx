import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  ArrowLeft, 
  Edit, 
  Building2, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  FolderKanban, 
  CreditCard, 
  FileText, 
  Users,
  UserCheck, 
  Plus, 
  Loader2,
  MoreVertical,
  Calendar
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  can_sign_documents: boolean;
  profiles: {
    email: string;
    full_name: string | null;
  };
}

const statusConfig: Record<string, { dotColor: string; bgColor: string }> = {
  draft: { dotColor: 'bg-muted-foreground', bgColor: 'bg-muted' },
  active: { dotColor: 'bg-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20' },
  on_hold: { dotColor: 'bg-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
  completed: { dotColor: 'bg-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  sent: { dotColor: 'bg-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  signed: { dotColor: 'bg-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20' },
  pending: { dotColor: 'bg-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
  cancelled: { dotColor: 'bg-red-500', bgColor: 'bg-red-50 dark:bg-red-900/20' },
  expired: { dotColor: 'bg-muted-foreground', bgColor: 'bg-muted' }
};

const AdminClientView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
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
        supabase.from('client_users').select('user_id, can_sign_documents, profiles(email, full_name)').eq('client_id', id)
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

  const getInitials = (name: string | null | undefined, fallback: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return fallback.slice(0, 2).toUpperCase();
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
  ].filter(Boolean).join(', ');

  const signerUsers = clientUsers.filter(u => u.can_sign_documents);

  return (
    <div className="relative min-h-full pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate('/admin/clients')} className="rounded-full h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          {!isMobile && (
            <Button asChild variant="default" className="bg-violet-600 hover:bg-violet-700">
              <Link to={`/admin/clients/${id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/admin/clients/${id}/edit`}>Edit Client</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/admin/documents/new?client=${id}`}>Create Document</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/admin/projects/new?client=${id}`}>Create Project</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Title & Industry Badge */}
      <div className="mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Client Details</h1>
          {client.industry && (
            <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 hover:bg-violet-100">
              {client.industry}
            </Badge>
          )}
        </div>
      </div>

      {/* Company Name */}
      <h2 className="text-xl font-semibold text-foreground mb-2">{client.company_name}</h2>

      {/* Member Since */}
      <p className="text-muted-foreground mb-6 text-sm">
        Client since {format(new Date(client.created_at), 'MMMM yyyy')}
      </p>

      {/* Quick Stats Boxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <FolderKanban className="h-4 w-4 text-violet-600" />
            <p className="text-xs text-muted-foreground">Projects</p>
          </div>
          <p className="font-semibold text-lg text-foreground">{projects.length}</p>
        </div>
        <div className="border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-blue-600" />
            <p className="text-xs text-muted-foreground">Documents</p>
          </div>
          <p className="font-semibold text-lg text-foreground">{documents.length}</p>
        </div>
        <div className="border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            <p className="text-xs text-muted-foreground">Subscriptions</p>
          </div>
          <p className="font-semibold text-lg text-foreground">{subscriptions.length}</p>
        </div>
        <div className="border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-orange-600" />
            <p className="text-xs text-muted-foreground">Portal Users</p>
          </div>
          <p className="font-semibold text-lg text-foreground">{clientUsers.length}</p>
        </div>
      </div>

      {/* Contact & Company Info */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-foreground mb-3">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Primary Contact */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
            <Avatar className="h-10 w-10 bg-violet-100 dark:bg-violet-900/30">
              <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                {client.contact_name ? getInitials(client.contact_name, 'NA') : <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Primary Contact</p>
              {client.contact_name ? (
                <p className="font-medium text-sm text-foreground truncate">{client.contact_name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Not set</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Email</p>
              {client.contact_email ? (
                <a href={`mailto:${client.contact_email}`} className="font-medium text-sm text-primary hover:underline truncate block">
                  {client.contact_email}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">Not set</p>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Phone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Phone</p>
              {client.phone ? (
                <a href={`tel:${client.phone}`} className="font-medium text-sm text-foreground truncate block">
                  {client.phone}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">Not set</p>
              )}
            </div>
          </div>

          {/* Website */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Globe className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Website</p>
              {client.website ? (
                <a href={client.website} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-primary hover:underline truncate block">
                  {client.website}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">Not set</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Address Section */}
      {fullAddress && (
        <div className="mb-6">
          <h3 className="text-base font-semibold text-foreground mb-3">Address</h3>
          <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl">
            <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Business Address</p>
              <p className="font-medium text-sm text-foreground">{fullAddress}</p>
            </div>
          </div>
        </div>
      )}

      {/* Portal Users Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground">Portal Users</h3>
          <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700 hover:bg-violet-50" asChild>
            <Link to="/admin/users">
              <Plus className="h-4 w-4 mr-1" />
              Manage Users
            </Link>
          </Button>
        </div>
        
        {clientUsers.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-xl">
            <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">No portal users assigned</p>
          </div>
        ) : (
          <div className="space-y-2">
            {clientUsers.map((cu) => (
              <div 
                key={cu.user_id} 
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  cu.can_sign_documents 
                    ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30' 
                    : 'bg-card border-border'
                }`}
              >
                <Avatar className="h-10 w-10 bg-violet-100 dark:bg-violet-900/30">
                  <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                    {getInitials(cu.profiles?.full_name, cu.profiles?.email || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {cu.profiles?.full_name || 'No name'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{cu.profiles?.email}</p>
                </div>
                {cu.can_sign_documents && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Signer
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Projects Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground">Recent Projects</h3>
          <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700 hover:bg-violet-50" asChild>
            <Link to={`/admin/projects/new?client=${id}`}>
              <Plus className="h-4 w-4 mr-1" />
              New Project
            </Link>
          </Button>
        </div>
        
        {projects.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-xl">
            <FolderKanban className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">No projects yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.slice(0, 5).map((project) => {
              const status = statusConfig[project.status] || statusConfig.draft;
              return (
                <Link 
                  key={project.id} 
                  to={`/admin/projects/${project.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                    <FolderKanban className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{project.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{project.service_type.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${status.dotColor}`} />
                    <span className="text-xs text-muted-foreground capitalize">{project.status.replace('_', ' ')}</span>
                  </div>
                </Link>
              );
            })}
            {projects.length > 5 && (
              <p className="text-xs text-muted-foreground text-center py-2">+{projects.length - 5} more projects</p>
            )}
          </div>
        )}
      </div>

      {/* Recent Documents Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground">Recent Documents</h3>
          <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700 hover:bg-violet-50" asChild>
            <Link to={`/admin/documents/new?client=${id}`}>
              <Plus className="h-4 w-4 mr-1" />
              New Document
            </Link>
          </Button>
        </div>
        
        {documents.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-xl">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">No documents yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.slice(0, 5).map((doc) => {
              const status = statusConfig[doc.status] || statusConfig.draft;
              return (
                <Link 
                  key={doc.id} 
                  to={`/admin/documents/${doc.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{doc.document_type.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${status.dotColor}`} />
                    <span className="text-xs text-muted-foreground capitalize">{doc.status}</span>
                  </div>
                </Link>
              );
            })}
            {documents.length > 5 && (
              <p className="text-xs text-muted-foreground text-center py-2">+{documents.length - 5} more documents</p>
            )}
          </div>
        )}
      </div>

      {/* Subscriptions Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground">Subscriptions</h3>
          <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700 hover:bg-violet-50" asChild>
            <Link to={`/admin/subscriptions/new?client=${id}`}>
              <Plus className="h-4 w-4 mr-1" />
              New Subscription
            </Link>
          </Button>
        </div>
        
        {subscriptions.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-xl">
            <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">No subscriptions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {subscriptions.slice(0, 5).map((sub) => {
              const status = statusConfig[sub.status] || statusConfig.draft;
              return (
                <Link 
                  key={sub.id} 
                  to={`/admin/subscriptions/${sub.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{sub.name}</p>
                    <p className="text-xs text-muted-foreground">${sub.amount}/{sub.billing_cycle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${status.dotColor}`} />
                    <span className="text-xs text-muted-foreground capitalize">{sub.status}</span>
                  </div>
                </Link>
              );
            })}
            {subscriptions.length > 5 && (
              <p className="text-xs text-muted-foreground text-center py-2">+{subscriptions.length - 5} more subscriptions</p>
            )}
          </div>
        )}
      </div>

      {/* Notes Section */}
      {client.notes && (
        <div className="mb-6">
          <h3 className="text-base font-semibold text-foreground mb-3">Notes</h3>
          <div className="p-4 bg-muted/30 rounded-xl">
            <p className="text-sm text-foreground whitespace-pre-wrap">{client.notes}</p>
          </div>
        </div>
      )}

      {/* Sticky Edit Button (Mobile) */}
      {isMobile && (
        <div className="fixed bottom-6 left-4 right-4 md:hidden">
          <Button asChild className="w-full bg-violet-600 hover:bg-violet-700 h-12 text-base font-medium rounded-xl shadow-lg">
            <Link to={`/admin/clients/${id}/edit`}>
              <Edit className="h-5 w-5 mr-2" />
              Edit Client
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminClientView;
