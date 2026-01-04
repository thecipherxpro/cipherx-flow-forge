import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, FileText, Eye, PenTool, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Document {
  id: string;
  title: string;
  document_type: string;
  service_type: string;
  status: string;
  version: number;
  created_at: string;
  sent_at: string | null;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
  signed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  cancelled: 'bg-muted text-muted-foreground'
};

const documentTypeLabels: Record<string, string> = {
  proposal: 'Proposal',
  contract: 'Contract',
  sla: 'SLA'
};

const PortalDocuments = () => {
  const { clientId } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!clientId) return;

      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('client_id', clientId)
          .in('status', ['sent', 'signed']) // Only show sent or signed documents
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDocuments(data || []);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [clientId]);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">View and sign your proposals, contracts, and SLAs</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle>Your Documents</CardTitle>
                <CardDescription>{documents.length} documents available</CardDescription>
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="sla">SLA</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="sent">Awaiting Signature</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' 
                  ? 'No documents match your filters' 
                  : 'No documents available'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredDocuments.map((doc) => (
                  <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {documentTypeLabels[doc.document_type] || doc.document_type}
                          </Badge>
                          <Badge className={`text-xs ${statusColors[doc.status] || ''}`}>
                            {doc.status === 'sent' ? 'Awaiting Signature' : doc.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {doc.sent_at 
                          ? `Sent ${format(new Date(doc.sent_at), 'MMM d, yyyy')}`
                          : format(new Date(doc.created_at), 'MMM d, yyyy')}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/portal/documents/${doc.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                        {doc.status === 'sent' && (
                          <Button size="sm" asChild>
                            <Link to={`/sign/${doc.id}`}>
                              <PenTool className="h-4 w-4 mr-1" />
                              Sign
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {documentTypeLabels[doc.document_type] || doc.document_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[doc.status] || ''}>
                            {doc.status === 'sent' ? 'Awaiting Signature' : doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {doc.sent_at 
                              ? format(new Date(doc.sent_at), 'MMM d, yyyy')
                              : format(new Date(doc.created_at), 'MMM d, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/portal/documents/${doc.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Link>
                            </Button>
                            {doc.status === 'sent' && (
                              <Button size="sm" asChild>
                                <Link to={`/sign/${doc.id}`}>
                                  <PenTool className="h-4 w-4 mr-1" />
                                  Sign
                                </Link>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalDocuments;
