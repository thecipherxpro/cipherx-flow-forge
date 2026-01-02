import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, FileText, Loader2, Copy, Lock, Unlock } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

type ServiceType = 'website_pwa_build' | 'website_only' | 'pwa_only' | 'cybersecurity' | 'graphic_design';
type DocumentType = 'proposal' | 'contract' | 'sla';

interface TemplateSection {
  key: string;
  title: string;
  content: string;
  isLocked: boolean;
  isRequired: boolean;
  sortOrder: number;
}

interface PricingItem {
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string;
}

interface ServiceTemplate {
  id: string;
  template_name: string;
  service_type: ServiceType;
  document_type: DocumentType;
  sections: TemplateSection[];
  default_pricing: PricingItem[];
  compliance_text: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const serviceTypeLabels: Record<ServiceType, string> = {
  website_pwa_build: 'Website + PWA Build',
  website_only: 'Website Only',
  pwa_only: 'PWA Only',
  cybersecurity: 'Cybersecurity',
  graphic_design: 'Graphic Design'
};

const documentTypeLabels: Record<DocumentType, string> = {
  proposal: 'Proposal',
  contract: 'Contract',
  sla: 'SLA'
};

const TemplateManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<ServiceTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterService, setFilterService] = useState<string>('all');
  const [filterDocType, setFilterDocType] = useState<string>('all');

  const { data: templates, isLoading } = useQuery({
    queryKey: ['service-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_templates')
        .select('*')
        .order('service_type', { ascending: true })
        .order('document_type', { ascending: true });
      
      if (error) throw error;
      return data as unknown as ServiceTemplate[];
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (template: Partial<ServiceTemplate> & { id: string }) => {
      const { id, ...updateData } = template;
      const { error } = await supabase
        .from('service_templates')
        .update({
          ...updateData,
          sections: updateData.sections as unknown as Json,
          default_pricing: updateData.default_pricing as unknown as Json,
          compliance_text: updateData.compliance_text as unknown as Json
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-templates'] });
      toast({ title: 'Template updated' });
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (template: Omit<ServiceTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('service_templates')
        .insert({
          template_name: template.template_name,
          service_type: template.service_type,
          document_type: template.document_type,
          sections: template.sections as unknown as Json,
          default_pricing: template.default_pricing as unknown as Json,
          compliance_text: template.compliance_text as unknown as Json,
          is_active: template.is_active
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-templates'] });
      toast({ title: 'Template created' });
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-templates'] });
      toast({ title: 'Template deleted' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('service_templates')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-templates'] });
    }
  });

  const handleCreateNew = () => {
    setEditingTemplate({
      id: '',
      template_name: '',
      service_type: 'website_pwa_build',
      document_type: 'proposal',
      sections: [],
      default_pricing: [],
      compliance_text: {},
      is_active: true,
      created_at: '',
      updated_at: ''
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (template: ServiceTemplate) => {
    setEditingTemplate({ ...template });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (template: ServiceTemplate) => {
    setEditingTemplate({
      ...template,
      id: '',
      template_name: `${template.template_name} (Copy)`,
      created_at: '',
      updated_at: ''
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingTemplate) return;
    
    if (editingTemplate.id) {
      updateMutation.mutate(editingTemplate);
    } else {
      const { id, created_at, updated_at, ...createData } = editingTemplate;
      createMutation.mutate(createData);
    }
  };

  const handleAddSection = () => {
    if (!editingTemplate) return;
    const newSection: TemplateSection = {
      key: `section_${Date.now()}`,
      title: 'New Section',
      content: '',
      isLocked: false,
      isRequired: false,
      sortOrder: editingTemplate.sections.length
    };
    setEditingTemplate({
      ...editingTemplate,
      sections: [...editingTemplate.sections, newSection]
    });
  };

  const handleUpdateSection = (index: number, field: keyof TemplateSection, value: unknown) => {
    if (!editingTemplate) return;
    const sections = [...editingTemplate.sections];
    sections[index] = { ...sections[index], [field]: value };
    setEditingTemplate({ ...editingTemplate, sections });
  };

  const handleRemoveSection = (index: number) => {
    if (!editingTemplate) return;
    const sections = editingTemplate.sections.filter((_, i) => i !== index);
    setEditingTemplate({ ...editingTemplate, sections });
  };

  const filteredTemplates = templates?.filter(t => {
    if (filterService !== 'all' && t.service_type !== filterService) return false;
    if (filterDocType !== 'all' && t.document_type !== filterDocType) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <Select value={filterService} onValueChange={setFilterService}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {Object.entries(serviceTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDocType} onValueChange={setFilterDocType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(documentTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Document Templates</CardTitle>
          <CardDescription>
            Manage proposal, contract, and SLA templates for each service type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates?.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.template_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{serviceTypeLabels[template.service_type]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{documentTypeLabels[template.document_type]}</Badge>
                  </TableCell>
                  <TableCell>{template.sections?.length || 0} sections</TableCell>
                  <TableCell>
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: template.id, is_active: checked })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(template)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(template.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!filteredTemplates || filteredTemplates.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No templates found. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              Configure the template settings and sections
            </DialogDescription>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    value={editingTemplate.template_name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, template_name: e.target.value })}
                    placeholder="Website + PWA Proposal"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={editingTemplate.is_active}
                      onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, is_active: checked })}
                    />
                    <Label>Active</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Service Type</Label>
                  <Select
                    value={editingTemplate.service_type}
                    onValueChange={(value: ServiceType) => setEditingTemplate({ ...editingTemplate, service_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(serviceTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select
                    value={editingTemplate.document_type}
                    onValueChange={(value: DocumentType) => setEditingTemplate({ ...editingTemplate, document_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(documentTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sections */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Template Sections</CardTitle>
                    <CardDescription>Define the sections that appear in this document type</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAddSection}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Section
                  </Button>
                </CardHeader>
                <CardContent>
                  {editingTemplate.sections.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No sections defined. Add sections to build your template.
                    </p>
                  ) : (
                    <Accordion type="multiple" className="space-y-2">
                      {editingTemplate.sections.map((section, index) => (
                        <AccordionItem key={section.key} value={section.key} className="border rounded-lg px-4">
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                              {section.isLocked ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}
                              <span>{section.title || 'Untitled Section'}</span>
                              {section.isRequired && <Badge variant="secondary" className="ml-2">Required</Badge>}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4 pt-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Section Key</Label>
                                <Input
                                  value={section.key}
                                  onChange={(e) => handleUpdateSection(index, 'key', e.target.value)}
                                  placeholder="executive_summary"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Section Title</Label>
                                <Input
                                  value={section.title}
                                  onChange={(e) => handleUpdateSection(index, 'title', e.target.value)}
                                  placeholder="Executive Summary"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Content</Label>
                              <Textarea
                                value={section.content}
                                onChange={(e) => handleUpdateSection(index, 'content', e.target.value)}
                                rows={6}
                                placeholder="Use {{CLIENT_NAME}}, {{SERVICE_TYPE}}, etc. for dynamic placeholders"
                              />
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={section.isLocked}
                                  onCheckedChange={(checked) => handleUpdateSection(index, 'isLocked', checked)}
                                />
                                <Label>Locked (read-only)</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={section.isRequired}
                                  onCheckedChange={(checked) => handleUpdateSection(index, 'isRequired', checked)}
                                />
                                <Label>Required</Label>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive ml-auto"
                                onClick={() => handleRemoveSection(index)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending || createMutation.isPending}>
              {(updateMutation.isPending || createMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate?.id ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplateManager;