import { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { SignatureCanvas, SignatureCanvasRef } from '@/components/SignatureCanvas';
import { 
  FileText, 
  Loader2, 
  Shield, 
  CheckCircle2, 
  Clock, 
  Lock,
  MapPin,
  Globe,
  Calendar,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';

interface DocumentSection {
  key: string;
  title: string;
  content: string;
}

interface LocationData {
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  timezone?: string;
}

const SignDocument = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const [searchParams] = useSearchParams();
  const signatureId = searchParams.get('sig');
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const signatureRef = useRef<SignatureCanvasRef>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [ipAddress, setIpAddress] = useState<string>('');

  // Fetch IP address
  useEffect(() => {
    const fetchIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setIpAddress(data.ip);
      } catch (error) {
        console.error('Failed to fetch IP:', error);
        setIpAddress('unknown');
      }
    };
    fetchIP();
  }, []);

  // Fetch location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Use reverse geocoding to get city/country
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await response.json();
            setLocationData({
              latitude,
              longitude,
              city: data.address?.city || data.address?.town || data.address?.village,
              country: data.address?.country,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });
          } catch {
            setLocationData({
              latitude,
              longitude,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });
          }
        },
        () => {
          setLocationData({
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
        }
      );
    }
  }, []);

  // Fetch document
  const { data: document, isLoading: docLoading } = useQuery({
    queryKey: ['sign-document', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*, clients(company_name)')
        .eq('id', documentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!documentId,
  });

  // Fetch signature record
  const { data: signature, isLoading: sigLoading } = useQuery({
    queryKey: ['signature', signatureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .eq('id', signatureId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!signatureId,
  });

  // Fetch all signatures for this document
  const { data: allSignatures } = useQuery({
    queryKey: ['document-signatures', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .eq('document_id', documentId)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!documentId,
  });

  // Submit signature mutation
  const signMutation = useMutation({
    mutationFn: async (signatureData: string) => {
      if (!signature || !document) throw new Error('Missing data');

      // Update signature with captured data
      const { error: sigError } = await supabase
        .from('signatures')
        .update({
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
          ip_address: ipAddress,
          location_data: locationData as any,
          user_agent: navigator.userAgent,
        })
        .eq('id', signature.id);

      if (sigError) throw sigError;

      // Log to audit trail
      await supabase.from('document_audit_log').insert([{
        document_id: document.id,
        action: 'signed',
        ip_address: ipAddress,
        details: JSON.parse(JSON.stringify({
          signer_name: signature.signer_name,
          signer_email: signature.signer_email,
          signer_role: signature.signer_role,
          location: locationData,
          user_agent: navigator.userAgent,
        })),
      }]);

      // Check if all required signatures are complete
      const { data: remainingSignatures } = await supabase
        .from('signatures')
        .select('id')
        .eq('document_id', document.id)
        .eq('is_required', true)
        .is('signed_at', null)
        .neq('id', signature.id);

      // If no remaining required signatures, lock the document
      if (!remainingSignatures || remainingSignatures.length === 0) {
        await supabase
          .from('documents')
          .update({ status: 'signed' })
          .eq('id', document.id);

        // Log document completion
        await supabase.from('document_audit_log').insert([{
          document_id: document.id,
          action: 'completed',
          ip_address: ipAddress,
          details: JSON.parse(JSON.stringify({
            message: 'All required signatures collected. Document locked.',
          })),
        }]);
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature', signatureId] });
      queryClient.invalidateQueries({ queryKey: ['document-signatures', documentId] });
      toast({ title: 'Document signed successfully!' });
    },
    onError: (error) => {
      console.error('Signing error:', error);
      toast({ variant: 'destructive', title: 'Failed to sign document' });
    },
  });

  const handleSign = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast({ variant: 'destructive', title: 'Please draw your signature' });
      return;
    }

    if (!agreed) {
      toast({ variant: 'destructive', title: 'Please agree to the terms' });
      return;
    }

    setIsSigning(true);
    try {
      const signatureData = signatureRef.current.getSignatureData();
      if (signatureData) {
        await signMutation.mutateAsync(signatureData);
      }
    } finally {
      setIsSigning(false);
    }
  };

  const sections: DocumentSection[] = (document?.content as any)?.sections || [];

  if (docLoading || sigLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!document || !signature) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Document not found</h2>
            <p className="text-muted-foreground">This signing link may be invalid or expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if document is already signed
  if (document.status === 'signed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Lock className="h-12 w-12 mx-auto text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Document Locked</h2>
            <p className="text-muted-foreground mb-4">
              This document has been fully signed and is now locked.
            </p>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Completed
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if this signature is already complete
  if (signature.signed_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Already Signed</h2>
            <p className="text-muted-foreground mb-4">
              You have already signed this document on{' '}
              {format(new Date(signature.signed_at), 'MMMM d, yyyy h:mm a')}.
            </p>
            <div className="text-sm text-muted-foreground">
              Signed by: {signature.signer_name}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if document is expired
  if (document.expires_at && new Date(document.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Clock className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Document Expired</h2>
            <p className="text-muted-foreground">
              This document expired on {format(new Date(document.expires_at), 'MMMM d, yyyy')}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {document.title}
                </CardTitle>
                <CardDescription className="mt-1">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {document.clients?.company_name}
                  </span>
                </CardDescription>
              </div>
              <Badge variant="outline" className="w-fit">
                {document.document_type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Created: {format(new Date(document.created_at), 'MMM d, yyyy')}
              </span>
              {document.expires_at && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Expires: {format(new Date(document.expires_at), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Signer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Signing as</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="font-medium">{signature.signer_name}</div>
                <div className="text-sm text-muted-foreground">{signature.signer_email}</div>
                <Badge variant="secondary" className="mt-2">{signature.signer_role}</Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {ipAddress && (
                  <div className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    IP: {ipAddress}
                  </div>
                )}
                {locationData?.city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {locationData.city}, {locationData.country}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Document Content</CardTitle>
            <CardDescription>Please review the document before signing</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] rounded-md border p-4">
              <div className="space-y-6">
                {sections.map((section, idx) => (
                  <div key={section.key}>
                    <h3 className="font-semibold text-lg mb-2">
                      {idx + 1}. {section.title}
                    </h3>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {section.content}
                    </div>
                    {idx < sections.length - 1 && <Separator className="mt-6" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Signature Status Overview */}
        {allSignatures && allSignatures.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Signature Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allSignatures.map((sig) => (
                  <div
                    key={sig.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      sig.id === signature.id ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{sig.signer_name}</div>
                      <div className="text-sm text-muted-foreground">{sig.signer_role}</div>
                    </div>
                    {sig.signed_at ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Signed
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signature Canvas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Your Signature
            </CardTitle>
            <CardDescription>
              Draw your signature below. This will be legally binding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignatureCanvas
              ref={signatureRef}
              height={180}
              onChange={setHasSignature}
            />

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <Label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer">
                I confirm that I have read and understood this document. I agree that my electronic 
                signature is the legal equivalent of my manual signature on this document. I consent 
                to the collection of my IP address and location data for verification purposes.
              </Label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleSign}
                disabled={!hasSignature || !agreed || isSigning}
                className="flex-1"
                size="lg"
              >
                {isSigning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Sign Document
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Your signature will be timestamped and recorded with your IP address and location 
              for legal verification purposes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignDocument;
