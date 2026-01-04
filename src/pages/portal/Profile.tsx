import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  User,
  Briefcase,
  Loader2
} from 'lucide-react';

interface ClientData {
  id: string;
  company_name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
}


const PortalProfile = () => {
  const { clientId, user } = useAuth();
  const [client, setClient] = useState<ClientData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClient = async () => {
      if (!clientId) return;

      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();

        if (error) throw error;
        setClient(data);
      } catch (error) {
        console.error('Error fetching client:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClient();
  }, [clientId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No company profile found</p>
      </div>
    );
  }

  const fullAddress = [
    client.address_line1,
    client.address_line2,
    [client.city, client.province, client.postal_code].filter(Boolean).join(', '),
    client.country
  ].filter(Boolean).join('\n');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Profile</h1>
        <p className="text-muted-foreground">Your organization details</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Information */}
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
              <p className="font-medium text-lg">{client.company_name}</p>
            </div>
            {client.industry && (
              <div>
                <p className="text-sm text-muted-foreground">Industry</p>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{client.industry}</span>
                </div>
              </div>
            )}
            {client.website && (
              <div>
                <p className="text-sm text-muted-foreground">Website</p>
                <a 
                  href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
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
                <p className="text-sm text-muted-foreground">Name</p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{client.contact_name}</span>
                </div>
              </div>
            )}
            {client.contact_email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <a 
                  href={`mailto:${client.contact_email}`}
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Mail className="h-4 w-4" />
                  {client.contact_email}
                </a>
              </div>
            )}
            {client.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <a 
                  href={`tel:${client.phone}`}
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Phone className="h-4 w-4" />
                  {client.phone}
                </a>
              </div>
            )}
            {!client.contact_name && !client.contact_email && !client.phone && (
              <p className="text-muted-foreground">No contact information on file</p>
            )}
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fullAddress ? (
              <div className="whitespace-pre-line">{fullAddress}</div>
            ) : (
              <p className="text-muted-foreground">No address on file</p>
            )}
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Account
            </CardTitle>
            <CardDescription>Your portal login details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{user?.user_metadata?.full_name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PortalProfile;
