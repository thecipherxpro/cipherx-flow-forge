-- Create company_settings table for storing company configuration
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'CipherX Solutions Inc.',
  legal_name text DEFAULT 'CipherX Solutions Inc.',
  email text DEFAULT NULL,
  phone text DEFAULT NULL,
  website text DEFAULT NULL,
  address_line1 text DEFAULT NULL,
  address_line2 text DEFAULT NULL,
  city text DEFAULT 'Toronto',
  province text DEFAULT 'Ontario',
  postal_code text DEFAULT NULL,
  country text DEFAULT 'Canada',
  tax_number text DEFAULT NULL,
  logo_url text DEFAULT NULL,
  primary_color text DEFAULT '#0F172A',
  secondary_color text DEFAULT '#3B82F6',
  default_payment_terms integer DEFAULT 30,
  default_tax_rate numeric DEFAULT 13,
  footer_text text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage company settings
CREATE POLICY "Admins can manage company settings"
ON public.company_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- CipherX users can view company settings
CREATE POLICY "CipherX users can view company settings"
ON public.company_settings
FOR SELECT
USING (is_cipherx_user(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default company settings row
INSERT INTO public.company_settings (company_name) VALUES ('CipherX Solutions Inc.');