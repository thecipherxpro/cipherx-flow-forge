import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, FileCheck, Scale } from 'lucide-react';
import { serviceTypeLabels } from '@/lib/templates/service-templates';
import type { Database } from '@/integrations/supabase/types';

type ServiceType = Database['public']['Enums']['service_type'];

interface Props {
  confirmed: boolean;
  onConfirm: (confirmed: boolean) => void;
  serviceType: ServiceType | null;
}

const complianceItems = [
  {
    id: 'pipeda',
    title: 'PIPEDA Compliance',
    description: 'Personal Information Protection and Electronic Documents Act',
    icon: <Shield className="h-5 w-5" />,
    always: true,
  },
  {
    id: 'phipa',
    title: 'PHIPA Compliance',
    description: 'Personal Health Information Protection Act (Ontario)',
    icon: <Lock className="h-5 w-5" />,
    always: true,
  },
  {
    id: 'nist',
    title: 'NIST Framework',
    description: 'NIST Cybersecurity Framework alignment',
    icon: <FileCheck className="h-5 w-5" />,
    services: ['cybersecurity', 'website_pwa_build', 'pwa_only'],
  },
  {
    id: 'iso27001',
    title: 'ISO 27001',
    description: 'Information Security Management standards',
    icon: <Shield className="h-5 w-5" />,
    services: ['cybersecurity'],
  },
  {
    id: 'owasp',
    title: 'OWASP Standards',
    description: 'Web Application Security best practices',
    icon: <Lock className="h-5 w-5" />,
    services: ['website_pwa_build', 'website_only', 'pwa_only'],
  },
  {
    id: 'ontario_law',
    title: 'Ontario Governing Law',
    description: 'Agreement governed by laws of Ontario, Canada',
    icon: <Scale className="h-5 w-5" />,
    always: true,
  },
];

export function StepCompliance({ confirmed, onConfirm, serviceType }: Props) {
  const applicableItems = complianceItems.filter(item => 
    item.always || (serviceType && item.services?.includes(serviceType))
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compliance Requirements</CardTitle>
          <CardDescription>
            The following compliance language is automatically included in this document
            {serviceType && ` for ${serviceTypeLabels[serviceType]}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {applicableItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{item.title}</h4>
                    <Badge variant="secondary" className="text-xs">Included</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className={confirmed ? 'border-primary bg-primary/5' : ''}>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <Checkbox
              id="compliance"
              checked={confirmed}
              onCheckedChange={(checked) => onConfirm(!!checked)}
              className="mt-1"
            />
            <div className="space-y-1">
              <label
                htmlFor="compliance"
                className="font-medium cursor-pointer"
              >
                I confirm that all applicable compliance requirements are met
              </label>
              <p className="text-sm text-muted-foreground">
                By checking this box, you confirm that CipherX Solutions has reviewed and
                included all necessary compliance language for the selected service type
                and that the document meets legal and regulatory requirements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
