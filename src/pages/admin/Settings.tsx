import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, FileText, Bell, Shield } from 'lucide-react';
import CompanySettings from '@/components/settings/CompanySettings';
import TemplateManager from '@/components/settings/TemplateManager';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('company');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your CipherX Solutions platform
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Company</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <CompanySettings />
        </TabsContent>

        <TabsContent value="templates">
          <TemplateManager />
        </TabsContent>

        <TabsContent value="notifications">
          <div className="flex items-center justify-center h-64 border rounded-lg border-dashed">
            <p className="text-muted-foreground">Notification settings coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="flex items-center justify-center h-64 border rounded-lg border-dashed">
            <p className="text-muted-foreground">Security settings coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;