import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  Globe,
  Phone,
  MapPin,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FolderKanban,
  FileText,
  CreditCard,
  Sparkles,
  User,
  Mail,
  Briefcase,
} from 'lucide-react';
import cipherxLogo from '@/assets/cipherx-logo.png';

type Step = 'welcome' | 'profile' | 'overview';

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('welcome');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    companyName: '',
    industry: '',
    website: '',
    phone: '',
    contactName: user?.user_metadata?.full_name || '',
    contactEmail: user?.email || '',
    addressLine1: '',
    city: '',
    province: '',
    postalCode: '',
    country: '',
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCompleteOnboarding = async () => {
    if (!user) return;

    if (!form.companyName.trim()) {
      toast({ variant: 'destructive', title: 'Company name is required' });
      setStep('profile');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create client record
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert({
          company_name: form.companyName.trim(),
          industry: form.industry || null,
          website: form.website || null,
          phone: form.phone || null,
          contact_name: form.contactName || null,
          contact_email: form.contactEmail || null,
          address_line1: form.addressLine1 || null,
          city: form.city || null,
          province: form.province || null,
          postal_code: form.postalCode || null,
          country: form.country || null,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (clientError) throw clientError;

      // Link user to client
      const { error: linkError } = await supabase
        .from('client_users')
        .insert({
          user_id: user.id,
          client_id: clientData.id,
          can_sign_documents: true,
        });

      if (linkError) throw linkError;

      // Mark onboarding complete
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast({ title: 'Welcome aboard!', description: 'Your profile has been set up successfully.' });
      
      // Force a full reload to refresh auth context with new clientId
      window.location.href = '/portal';
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast({ variant: 'destructive', title: 'Setup failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const portalFeatures = [
    { icon: FolderKanban, title: 'Projects', desc: 'Track your active projects and milestones' },
    { icon: FileText, title: 'Documents', desc: 'Review and sign proposals, contracts & SLAs' },
    { icon: CreditCard, title: 'Subscriptions', desc: 'View your active subscriptions and billing' },
    { icon: Building2, title: 'Profile', desc: 'Manage your company information anytime' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['welcome', 'profile', 'overview'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? 'w-8 bg-primary' : i < ['welcome', 'profile', 'overview'].indexOf(step) ? 'w-8 bg-primary/50' : 'w-8 bg-muted'
              }`}
            />
          ))}
        </div>

        {step === 'welcome' && (
          <Card className="text-center">
            <CardHeader className="pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <Sparkles className="h-12 w-12 text-primary" />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <img src={cipherxLogo} alt="CipherX Logo" className="h-8 w-8 object-contain" />
                <span className="text-xl font-bold">CipherX Solutions</span>
              </div>
              <CardTitle className="text-2xl">Welcome, {user?.user_metadata?.full_name || 'there'}!</CardTitle>
              <CardDescription className="text-base">
                Let's get your client portal set up. This will only take a minute.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We'll help you create your company profile so you can start managing your projects, documents, and subscriptions.
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => setStep('profile')}>
                Get Started <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Profile
              </CardTitle>
              <CardDescription>Tell us about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="companyName"
                    placeholder="Your Company Name"
                    value={form.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="industry"
                      placeholder="e.g. Technology"
                      value={form.industry}
                      onChange={(e) => updateField('industry', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website"
                      placeholder="www.example.com"
                      value={form.website}
                      onChange={(e) => updateField('website', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contactName"
                      placeholder="John Doe"
                      value={form.contactName}
                      onChange={(e) => updateField('contactName', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="+1 234 567 8900"
                      value={form.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="addressLine1"
                    placeholder="Street address"
                    value={form.addressLine1}
                    onChange={(e) => updateField('addressLine1', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <Input
                    id="province"
                    placeholder="Province"
                    value={form.province}
                    onChange={(e) => updateField('province', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    placeholder="A1B 2C3"
                    value={form.postalCode}
                    onChange={(e) => updateField('postalCode', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="Canada"
                  value={form.country}
                  onChange={(e) => updateField('country', e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('welcome')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={() => setStep('overview')}>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 'overview' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Your Portal Overview</CardTitle>
              <CardDescription>Here's what you'll have access to</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {portalFeatures.map((f) => (
                <div key={f.title} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="p-2 rounded-md bg-primary/10">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('profile')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={handleCompleteOnboarding} disabled={isSubmitting}>
                {isSubmitting ? 'Setting up...' : (
                  <>Complete Setup <CheckCircle2 className="h-4 w-4 ml-2" /></>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
