import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, FileText, FileSignature, ClipboardList } from 'lucide-react';
import { documentTypeLabels, getTemplate, serviceTypeLabels } from '@/lib/templates/service-templates';
import type { Database } from '@/integrations/supabase/types';

type DocumentType = Database['public']['Enums']['document_type'];
type ServiceType = Database['public']['Enums']['service_type'];

interface Props {
  documentType: DocumentType | null;
  serviceType: ServiceType | null;
  onSelect: (type: DocumentType) => void;
  title: string;
  onTitleChange: (title: string) => void;
}

const documentOptions: { type: DocumentType; icon: React.ReactNode; description: string; sections: number }[] = [
  {
    type: 'proposal',
    icon: <FileText className="h-5 w-5 sm:h-6 sm:w-6" />,
    description: 'Business proposal with scope, deliverables, timeline, and pricing',
    sections: 8,
  },
  {
    type: 'contract',
    icon: <FileSignature className="h-5 w-5 sm:h-6 sm:w-6" />,
    description: 'Legal service contract with terms, IP ownership, and obligations',
    sections: 14,
  },
  {
    type: 'sla',
    icon: <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6" />,
    description: 'Service Level Agreement with uptime, response times, and credits',
    sections: 11,
  },
];

export function StepLoadTemplate({ documentType, serviceType, onSelect, title, onTitleChange }: Props) {
  const selectedTemplate = documentType && serviceType ? getTemplate(documentType, serviceType) : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        {documentOptions.map((option) => {
          const template = serviceType ? getTemplate(option.type, serviceType) : null;
          
          return (
            <Card
              key={option.type}
              className={`cursor-pointer transition-all hover:border-primary ${
                documentType === option.type ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => onSelect(option.type)}
            >
              <CardHeader className="pb-2 p-3 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className={`p-1.5 sm:p-2 rounded-lg ${documentType === option.type ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {option.icon}
                  </div>
                  {documentType === option.type && (
                    <Badge className="bg-primary text-xs">
                      <Check className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base sm:text-lg">{documentTypeLabels[option.type]}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <CardDescription className="mb-2 text-xs sm:text-sm line-clamp-2">{option.description}</CardDescription>
                <Badge variant="outline" className="text-[10px] sm:text-xs">
                  {template?.sections.length || option.sections} sections
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedTemplate && (
        <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm">Document Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Enter document title..."
              className="text-sm"
            />
          </div>
          
          <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm sm:text-base mb-1 sm:mb-2">Template Loaded: {selectedTemplate.templateName}</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {selectedTemplate.sections.length} sections • {serviceType && serviceTypeLabels[serviceType]}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
