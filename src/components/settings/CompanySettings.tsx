import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Building2, Mail, Phone, Globe, MapPin, Save, Loader2 } from "lucide-react";

interface CompanySettingsData {
  id: string;
  company_name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  tax_number: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  default_payment_terms: number | null;
  default_tax_rate: number | null;
  footer_text: string | null;
}

const CompanySettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<CompanySettingsData>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_settings").select("*").single();

      if (error) throw error;
      return data as CompanySettingsData;
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<CompanySettingsData>) => {
      const { error } = await supabase.from("company_settings").update(data).eq("id", settings?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast({ title: "Settings saved", description: "Company settings have been updated." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const handleChange = (field: keyof CompanySettingsData, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company Identity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Company Identity</CardTitle>
          </div>
          <CardDescription>Basic company information used in documents and communications</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={formData.company_name || ""}
              onChange={(e) => handleChange("company_name", e.target.value)}
              placeholder="CipherX Solutions Inc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="legal_name">Legal Name</Label>
            <Input
              id="legal_name"
              value={formData.legal_name || ""}
              onChange={(e) => handleChange("legal_name", e.target.value)}
              placeholder="CipherX Solutions Inc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax_number">(HST/GST)TAX ID:</Label>
            <Input
              id="tax_number"
              value={formData.tax_number || ""}
              onChange={(e) => handleChange("tax_number", e.target.value)}
              placeholder="123456789RT0001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              value={formData.logo_url || ""}
              onChange={(e) => handleChange("logo_url", e.target.value)}
              placeholder="https://..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Contact Information</CardTitle>
          </div>
          <CardDescription>How clients can reach your company</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                className="pl-10"
                value={formData.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="contact@cipherx.ca"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                className="pl-10"
                value={formData.phone || ""}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+1 (416) 555-0123"
              />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="website">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="website"
                className="pl-10"
                value={formData.website || ""}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder="https://cipherx.ca"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle>Business Address</CardTitle>
          </div>
          <CardDescription>Company address for documents and correspondence</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address_line1">Address Line 1</Label>
            <Input
              id="address_line1"
              value={formData.address_line1 || ""}
              onChange={(e) => handleChange("address_line1", e.target.value)}
              placeholder="123 Business Street"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address_line2">Address Line 2</Label>
            <Input
              id="address_line2"
              value={formData.address_line2 || ""}
              onChange={(e) => handleChange("address_line2", e.target.value)}
              placeholder="Suite 100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city || ""}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="Toronto"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="province">Province</Label>
            <Input
              id="province"
              value={formData.province || ""}
              onChange={(e) => handleChange("province", e.target.value)}
              placeholder="Ontario"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code">Postal Code</Label>
            <Input
              id="postal_code"
              value={formData.postal_code || ""}
              onChange={(e) => handleChange("postal_code", e.target.value)}
              placeholder="M5V 1A1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country || ""}
              onChange={(e) => handleChange("country", e.target.value)}
              placeholder="Canada"
            />
          </div>
        </CardContent>
      </Card>

      {/* Document Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Document Defaults</CardTitle>
          <CardDescription>Default values applied to new documents</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="default_payment_terms">Default Payment Terms (days)</Label>
            <Input
              id="default_payment_terms"
              type="number"
              value={formData.default_payment_terms || 30}
              onChange={(e) => handleChange("default_payment_terms", parseInt(e.target.value) || 30)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_tax_rate">Default Tax Rate (%)</Label>
            <Input
              id="default_tax_rate"
              type="number"
              step="0.01"
              value={formData.default_tax_rate || 13}
              onChange={(e) => handleChange("default_tax_rate", parseFloat(e.target.value) || 13)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="footer_text">Document Footer Text</Label>
            <Textarea
              id="footer_text"
              value={formData.footer_text || ""}
              onChange={(e) => handleChange("footer_text", e.target.value)}
              placeholder="Thank you for your business..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Branding Colors</CardTitle>
          <CardDescription>Colors used in documents and client portal</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primary_color">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primary_color"
                type="color"
                className="w-16 h-10 p-1"
                value={formData.primary_color || "#0F172A"}
                onChange={(e) => handleChange("primary_color", e.target.value)}
              />
              <Input
                value={formData.primary_color || "#0F172A"}
                onChange={(e) => handleChange("primary_color", e.target.value)}
                placeholder="#0F172A"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondary_color">Secondary Color</Label>
            <div className="flex gap-2">
              <Input
                id="secondary_color"
                type="color"
                className="w-16 h-10 p-1"
                value={formData.secondary_color || "#3B82F6"}
                onChange={(e) => handleChange("secondary_color", e.target.value)}
              />
              <Input
                value={formData.secondary_color || "#3B82F6"}
                onChange={(e) => handleChange("secondary_color", e.target.value)}
                placeholder="#3B82F6"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default CompanySettings;
