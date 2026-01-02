import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, FileText, Bell, Shield } from 'lucide-react';
import CompanySettings from '@/components/settings/CompanySettings';
import TemplateManager from '@/components/settings/TemplateManager';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('company');

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your CipherX Solutions platform
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="w-full grid grid-cols-4 h-auto p-1">
          <TabsTrigger value="company" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3">
            <Building2 className="h-4 w-4" />
            <span className="text-[10px] sm:text-sm">Company</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3">
            <FileText className="h-4 w-4" />
            <span className="text-[10px] sm:text-sm">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3">
            <Bell className="h-4 w-4" />
            <span className="text-[10px] sm:text-sm">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3">
            <Shield className="h-4 w-4" />
            <span className="text-[10px] sm:text-sm">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <CompanySettings />
        </TabsContent>

        <TabsContent value="templates">
          <TemplateManager />
        </TabsContent>

        <TabsContent value="notifications">
          <div className="flex items-center justify-center h-48 sm:h-64 border rounded-lg border-dashed">
            <p className="text-muted-foreground text-sm">Notification settings coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="flex items-center justify-center h-48 sm:h-64 border rounded-lg border-dashed">
            <p className="text-muted-foreground text-sm">Security settings coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;