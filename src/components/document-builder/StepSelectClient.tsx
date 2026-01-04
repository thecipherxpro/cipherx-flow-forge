import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, Check } from 'lucide-react';

interface Client {
  id: string;
  company_name: string;
  address_line1: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
}

interface Props {
  selectedClient: Client | null;
  onSelect: (client: Client) => void;
}

export function StepSelectClient({ selectedClient, onSelect }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name, address_line1, city, province, postal_code')
        .order('company_name');
      
      if (!error && data) {
        setClients(data);
      }
      setIsLoading(false);
    };
    fetchClients();
  }, []);

  const filteredClients = clients.filter(c =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Loading clients...</div>;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      <div className="grid gap-2 sm:gap-3 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
        {filteredClients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No clients found. Create a client first.
          </div>
        ) : (
          filteredClients.map((client) => (
            <Card
              key={client.id}
              className={`cursor-pointer transition-all hover:border-primary ${
                selectedClient?.id === client.id ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => onSelect(client)}
            >
              <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{client.company_name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {[client.city, client.province].filter(Boolean).join(', ') || 'No address'}
                    </p>
                  </div>
                </div>
                {selectedClient?.id === client.id && (
                  <Badge className="bg-primary flex-shrink-0 text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Selected</span>
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
