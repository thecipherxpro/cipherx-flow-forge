-- Create company_signers table
CREATE TABLE public.company_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  position TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_signers ENABLE ROW LEVEL SECURITY;

-- Policies for admin management
CREATE POLICY "Admins can manage company signers"
  ON public.company_signers FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "CipherX users can view company signers"
  ON public.company_signers FOR SELECT
  USING (is_cipherx_user(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_company_signers_updated_at
  BEFORE UPDATE ON public.company_signers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create compliance_items table
CREATE TABLE public.compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  icon TEXT DEFAULT 'Shield',
  service_types TEXT[] DEFAULT '{}',
  is_always_applicable BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage compliance items"
  ON public.compliance_items FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "CipherX users can view compliance items"
  ON public.compliance_items FOR SELECT
  USING (is_cipherx_user(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_compliance_items_updated_at
  BEFORE UPDATE ON public.compliance_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default compliance items
INSERT INTO public.compliance_items (title, description, content, icon, service_types, is_always_applicable, sort_order) VALUES
('PIPEDA Compliance', 'Personal Information Protection and Electronic Documents Act', 'CipherX Solutions Inc. agrees to comply with the Personal Information Protection and Electronic Documents Act (PIPEDA) and all applicable privacy legislation in the collection, use, and disclosure of personal information in the course of providing services under this agreement.', 'Shield', '{}', true, 1),
('PHIPA Compliance', 'Personal Health Information Protection Act (Ontario)', 'Where applicable, CipherX Solutions Inc. agrees to comply with the Personal Health Information Protection Act (PHIPA) and maintain appropriate safeguards for any personal health information handled in the course of providing services.', 'Lock', '{}', true, 2),
('NIST Framework', 'NIST Cybersecurity Framework alignment', 'Services provided under this agreement align with the National Institute of Standards and Technology (NIST) Cybersecurity Framework, incorporating best practices for identifying, protecting, detecting, responding to, and recovering from cybersecurity threats.', 'FileCheck', ARRAY['cybersecurity', 'website_pwa_build', 'pwa_only'], false, 3),
('ISO 27001', 'Information Security Management standards', 'CipherX Solutions Inc. follows ISO 27001 information security management standards in the delivery of cybersecurity services, ensuring systematic management of sensitive information.', 'Shield', ARRAY['cybersecurity'], false, 4),
('OWASP Standards', 'Web Application Security best practices', 'All web development services incorporate OWASP (Open Web Application Security Project) best practices and guidelines to ensure application security and protect against common vulnerabilities.', 'Lock', ARRAY['website_pwa_build', 'website_only', 'pwa_only'], false, 5),
('Ontario Governing Law', 'Agreement governed by laws of Ontario, Canada', 'This Agreement shall be governed by and construed in accordance with the laws of the Province of Ontario and the federal laws of Canada applicable therein. Any disputes arising under this agreement shall be subject to the exclusive jurisdiction of the courts of Ontario.', 'Scale', '{}', true, 6);