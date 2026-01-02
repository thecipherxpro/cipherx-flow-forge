import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Globe, Smartphone, Shield, Palette } from 'lucide-react';
import { serviceTypeLabels } from '@/lib/templates/service-templates';
import type { Database } from '@/integrations/supabase/types';

type ServiceType = Database['public']['Enums']['service_type'];

interface Props {
  serviceType: ServiceType | null;
  onSelect: (type: ServiceType) => void;
}

const serviceOptions: { type: ServiceType; icon: React.ReactNode; description: string; pricingModel: string }[] = [
  {
    type: 'website_pwa_build',
    icon: <Globe className="h-6 w-6" />,
    description: 'Complete website with Progressive Web App capabilities for mobile users',
    pricingModel: 'Fixed project + hosting',
  },
  {
    type: 'website_only',
    icon: <Globe className="h-6 w-6" />,
    description: 'Professional responsive website with CMS and hosting',
    pricingModel: 'Fixed project',
  },
  {
    type: 'pwa_only',
    icon: <Smartphone className="h-6 w-6" />,
    description: 'Standalone Progressive Web App with offline capabilities',
    pricingModel: 'Fixed project',
  },
  {
    type: 'cybersecurity',
    icon: <Shield className="h-6 w-6" />,
    description: '24/7 security monitoring, vulnerability management, and incident response',
    pricingModel: 'Monthly subscription',
  },
  {
    type: 'graphic_design',
    icon: <Palette className="h-6 w-6" />,
    description: 'Branding, graphic design, photography, and videography services',
    pricingModel: 'Package or hourly',
  },
];

export function StepSelectService({ serviceType, onSelect }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {serviceOptions.map((option) => (
        <Card
          key={option.type}
          className={`cursor-pointer transition-all hover:border-primary ${
            serviceType === option.type ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => onSelect(option.type)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-lg ${serviceType === option.type ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {option.icon}
              </div>
              {serviceType === option.type && (
                <Badge className="bg-primary">
                  <Check className="h-3 w-3" />
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">{serviceTypeLabels[option.type]}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-2">{option.description}</CardDescription>
            <Badge variant="outline" className="text-xs">{option.pricingModel}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
