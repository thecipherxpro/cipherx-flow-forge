import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2, ChevronUp, ChevronDown, Edit2, Check, X } from 'lucide-react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useIsMobile } from '@/hooks/use-mobile';
import type { TemplateSection } from '@/lib/templates/service-templates';

interface Props {
  sections: TemplateSection[];
  onChange: (sections: TemplateSection[]) => void;
  processContent?: (content: string) => string;
}

export function StepEditSections({ sections, onChange }: Props) {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const isMobile = useIsMobile();

  const updateSection = (key: string, content: string) => {
    onChange(sections.map(s => s.key === key ? { ...s, content } : s));
  };

  const updateSectionTitle = (key: string, title: string) => {
    onChange(sections.map(s => s.key === key ? { ...s, title } : s));
    setEditingTitle(null);
  };

  const startEditingTitle = (key: string, currentTitle: string) => {
    setEditingTitle(key);
    setTempTitle(currentTitle);
  };

  const addCustomSection = () => {
    const newSection: TemplateSection = {
      key: `custom_${Date.now()}`,
      title: 'New Custom Section',
      content: '<p>Enter your custom content here...</p>',
      isLocked: false,
      isRequired: false,
      sortOrder: sections.length,
    };
    onChange([...sections, newSection]);
    setExpandedSections([...expandedSections, newSection.key]);
  };

  const removeSection = (key: string) => {
    onChange(sections.filter(s => s.key !== key));
  };

  const moveSection = (key: string, direction: 'up' | 'down') => {
    const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex(s => s.key === key);
    if (direction === 'up' && idx > 0) {
      const temp = sorted[idx].sortOrder;
      sorted[idx].sortOrder = sorted[idx - 1].sortOrder;
      sorted[idx - 1].sortOrder = temp;
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const temp = sorted[idx].sortOrder;
      sorted[idx].sortOrder = sorted[idx + 1].sortOrder;
      sorted[idx + 1].sortOrder = temp;
    }
    onChange(sorted);
  };

  const sortedSections = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg">Document Sections</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {sections.length} sections • All sections are fully editable
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addCustomSection} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <Accordion type="multiple" value={expandedSections} onValueChange={setExpandedSections} className="space-y-2">
            {sortedSections.map((section, idx) => (
              <AccordionItem key={section.key} value={section.key} className="border rounded-lg overflow-hidden">
                <div className="flex items-center">
                  {/* Move buttons */}
                  <div className={`flex ${isMobile ? 'flex-row' : 'flex-col'} px-1 sm:px-2 border-r`}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 sm:h-7 sm:w-7"
                      disabled={idx === 0}
                      onClick={(e) => { e.stopPropagation(); moveSection(section.key, 'up'); }}
                    >
                      <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 sm:h-7 sm:w-7"
                      disabled={idx === sortedSections.length - 1}
                      onClick={(e) => { e.stopPropagation(); moveSection(section.key, 'down'); }}
                    >
                      <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  <AccordionTrigger className="px-2 sm:px-4 hover:no-underline flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      {editingTitle === section.key ? (
                        <div className="flex items-center gap-1 sm:gap-2 flex-1" onClick={e => e.stopPropagation()}>
                          <Input
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            className="h-7 text-xs sm:text-sm flex-1 min-w-0"
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0" onClick={() => updateSectionTitle(section.key, tempTitle)}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0" onClick={() => setEditingTitle(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
                          <span className="font-medium text-xs sm:text-sm truncate">{section.title}</span>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-5 w-5 flex-shrink-0"
                            onClick={(e) => { e.stopPropagation(); startEditingTitle(section.key, section.title); }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      
                      <div className="hidden sm:flex gap-2 ml-auto mr-4 flex-shrink-0">
                        {section.isRequired && <Badge variant="secondary" className="text-xs">Required</Badge>}
                        {section.key.startsWith('custom_') && <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs">Custom</Badge>}
                      </div>
                    </div>
                  </AccordionTrigger>
                </div>
                <AccordionContent className="px-2 sm:px-4 pb-4 pt-2 sm:ml-10">
                  {/* Mobile badges */}
                  <div className="sm:hidden flex gap-2 mb-3">
                    {section.isRequired && <Badge variant="secondary" className="text-xs">Required</Badge>}
                    {section.key.startsWith('custom_') && <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs">Custom</Badge>}
                  </div>
                  
                  <div className="space-y-3">
                    <RichTextEditor
                      value={section.content}
                      onChange={(content) => updateSection(section.key, content)}
                      minHeight={isMobile ? "200px" : "250px"}
                    />
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex gap-1 sm:gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] sm:text-xs font-mono cursor-help" title="Client company name">{'{{CLIENT_NAME}}'}</Badge>
                        <Badge variant="outline" className="text-[10px] sm:text-xs font-mono cursor-help" title="Current date">{'{{DATE}}'}</Badge>
                        <Badge variant="outline" className="text-[10px] sm:text-xs font-mono cursor-help" title="Document expiry date">{'{{EXPIRY_DATE}}'}</Badge>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => removeSection(section.key)} className="w-full sm:w-auto">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          {sortedSections.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No sections yet. Click "Add Section" to create one.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
