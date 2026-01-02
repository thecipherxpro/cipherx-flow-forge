import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Lock, Unlock, Plus, Trash2 } from 'lucide-react';
import type { TemplateSection } from '@/lib/templates/service-templates';

interface Props {
  sections: TemplateSection[];
  onChange: (sections: TemplateSection[]) => void;
  processContent: (content: string) => string;
}

export function StepEditSections({ sections, onChange, processContent }: Props) {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const updateSection = (key: string, content: string) => {
    onChange(sections.map(s => s.key === key ? { ...s, content } : s));
  };

  const addCustomSection = () => {
    const newSection: TemplateSection = {
      key: `custom_${Date.now()}`,
      title: 'Custom Section',
      content: 'Enter your custom content here...',
      isLocked: false,
      isRequired: false,
      sortOrder: sections.length,
    };
    onChange([...sections, newSection]);
  };

  const removeSection = (key: string) => {
    onChange(sections.filter(s => s.key !== key));
  };

  const sortedSections = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {sections.filter(s => s.isLocked).length} locked sections • {sections.filter(s => !s.isLocked).length} editable sections
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addCustomSection}>
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>

      <Accordion type="multiple" value={expandedSections} onValueChange={setExpandedSections} className="space-y-2">
        {sortedSections.map((section) => (
          <AccordionItem key={section.key} value={section.key} className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                {section.isLocked ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Unlock className="h-4 w-4 text-primary" />
                )}
                <span className="font-medium">{section.title}</span>
                <div className="flex gap-2">
                  {section.isRequired && <Badge variant="secondary">Required</Badge>}
                  {section.isLocked && <Badge variant="outline">Legal Text</Badge>}
                  {section.key.startsWith('custom_') && <Badge>Custom</Badge>}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {section.isLocked ? (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    This section contains legal text and cannot be modified.
                  </p>
                  <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                    {processContent(section.content)}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    value={section.content}
                    onChange={(e) => updateSection(section.key, e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      Use {'{{CLIENT_NAME}}'}, {'{{DATE}}'}, {'{{EXPIRY_DATE}}'} for auto-fill
                    </p>
                    {section.key.startsWith('custom_') && (
                      <Button variant="ghost" size="sm" onClick={() => removeSection(section.key)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
