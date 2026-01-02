-- =====================================================
-- CIPHERX SOLUTIONS - ENTERPRISE OPERATIONS PLATFORM
-- Database Schema Migration
-- =====================================================

-- ===================
-- ENUMS
-- ===================

-- User roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'client');

-- Project status enum
CREATE TYPE public.project_status AS ENUM ('draft', 'active', 'on_hold', 'completed');

-- Document type enum
CREATE TYPE public.document_type AS ENUM ('proposal', 'contract', 'sla');

-- Document status enum
CREATE TYPE public.document_status AS ENUM ('draft', 'sent', 'signed', 'expired', 'cancelled');

-- Service type enum
CREATE TYPE public.service_type AS ENUM (
  'website_pwa_build',
  'website_only',
  'pwa_only',
  'cybersecurity',
  'graphic_design'
);

-- Subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'pending', 'cancelled', 'expired');

-- Subscription billing cycle enum
CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'quarterly', 'annually');

-- ===================
-- PROFILES TABLE
-- ===================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================
-- USER ROLES TABLE (Secure role storage)
-- ===================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ===================
-- CLIENTS TABLE
-- ===================

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  province TEXT DEFAULT 'Ontario',
  postal_code TEXT,
  country TEXT DEFAULT 'Canada',
  industry TEXT,
  website TEXT,
  phone TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================
-- CLIENT CONTACTS TABLE
-- ===================

CREATE TABLE public.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  job_title TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================
-- CLIENT USERS TABLE (Portal access)
-- ===================

CREATE TABLE public.client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  can_sign_documents BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);

-- ===================
-- PROJECTS TABLE
-- ===================

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  service_type service_type NOT NULL,
  status project_status NOT NULL DEFAULT 'draft',
  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================
-- PROJECT MILESTONES TABLE
-- ===================

CREATE TABLE public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================
-- DOCUMENTS TABLE
-- ===================

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  document_type document_type NOT NULL,
  service_type service_type NOT NULL,
  title TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status document_status NOT NULL DEFAULT 'draft',
  content JSONB NOT NULL DEFAULT '{}',
  pricing_data JSONB DEFAULT '{}',
  compliance_confirmed BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================
-- DOCUMENT SECTIONS TABLE
-- ===================

CREATE TABLE public.document_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  section_key TEXT NOT NULL,
  section_title TEXT NOT NULL,
  content TEXT,
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================
-- SIGNATURES TABLE
-- ===================

CREATE TABLE public.signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  signer_id UUID REFERENCES auth.users(id),
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_role TEXT NOT NULL, -- 'cipherx_representative' or 'client'
  signature_data TEXT, -- Base64 encoded signature image
  signed_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  location_data JSONB,
  is_required BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================
-- DOCUMENT AUDIT LOG TABLE
-- ===================

CREATE TABLE public.document_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================
-- SUBSCRIPTIONS TABLE
-- ===================

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_third_party BOOLEAN DEFAULT false,
  provider_name TEXT, -- For third-party services
  amount DECIMAL(10,2) NOT NULL,
  billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  status subscription_status NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL,
  next_billing_date DATE,
  end_date DATE,
  auto_renew BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================
-- PROJECT FILES TABLE
-- ===================

CREATE TABLE public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================
-- SERVICE TEMPLATES TABLE
-- ===================

CREATE TABLE public.service_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type service_type NOT NULL,
  document_type document_type NOT NULL,
  template_name TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]',
  default_pricing JSONB DEFAULT '[]',
  compliance_text JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_type, document_type)
);

-- ===================
-- SECURITY DEFINER FUNCTIONS
-- ===================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin or staff
CREATE OR REPLACE FUNCTION public.is_cipherx_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'staff')
  )
$$;

-- Function to get user's client_id (for client users)
CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id
  FROM public.client_users
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Function to check if user belongs to a client
CREATE OR REPLACE FUNCTION public.user_belongs_to_client(_user_id UUID, _client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_users
    WHERE user_id = _user_id
      AND client_id = _client_id
  )
$$;

-- ===================
-- TRIGGERS FOR UPDATED_AT
-- ===================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_contacts_updated_at
  BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_sections_updated_at
  BEFORE UPDATE ON public.document_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_templates_updated_at
  BEFORE UPDATE ON public.service_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================
-- TRIGGER: Auto-create profile on user signup
-- ===================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================
-- ROW LEVEL SECURITY
-- ===================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;

-- ===================
-- PROFILES POLICIES
-- ===================

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ===================
-- USER ROLES POLICIES
-- ===================

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ===================
-- CLIENTS POLICIES
-- ===================

CREATE POLICY "CipherX users can view all clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (public.is_cipherx_user(auth.uid()));

CREATE POLICY "Admins can manage clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Client users can view their own client"
  ON public.clients FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_client(auth.uid(), id));

-- ===================
-- CLIENT CONTACTS POLICIES
-- ===================

CREATE POLICY "CipherX users can view all client contacts"
  ON public.client_contacts FOR SELECT
  TO authenticated
  USING (public.is_cipherx_user(auth.uid()));

CREATE POLICY "Admins can manage client contacts"
  ON public.client_contacts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Client users can view their own contacts"
  ON public.client_contacts FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_client(auth.uid(), client_id));

-- ===================
-- CLIENT USERS POLICIES
-- ===================

CREATE POLICY "CipherX users can view all client users"
  ON public.client_users FOR SELECT
  TO authenticated
  USING (public.is_cipherx_user(auth.uid()));

CREATE POLICY "Admins can manage client users"
  ON public.client_users FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Client users can view their own record"
  ON public.client_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ===================
-- PROJECTS POLICIES
-- ===================

CREATE POLICY "CipherX users can view all projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (public.is_cipherx_user(auth.uid()));

CREATE POLICY "Admins can manage projects"
  ON public.projects FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can create and update projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Client users can view their own projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_client(auth.uid(), client_id));

-- ===================
-- PROJECT MILESTONES POLICIES
-- ===================

CREATE POLICY "CipherX users can view all milestones"
  ON public.project_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.is_cipherx_user(auth.uid())
    )
  );

CREATE POLICY "Admins can manage milestones"
  ON public.project_milestones FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can manage milestones"
  ON public.project_milestones FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Client users can view their project milestones"
  ON public.project_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.user_belongs_to_client(auth.uid(), p.client_id)
    )
  );

-- ===================
-- DOCUMENTS POLICIES
-- ===================

CREATE POLICY "CipherX users can view all documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (public.is_cipherx_user(auth.uid()));

CREATE POLICY "Admins can manage documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can create and update draft documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update draft documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') AND status = 'draft');

CREATE POLICY "Client users can view their own documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_client(auth.uid(), client_id));

-- ===================
-- DOCUMENT SECTIONS POLICIES
-- ===================

CREATE POLICY "CipherX users can view all document sections"
  ON public.document_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_id
      AND public.is_cipherx_user(auth.uid())
    )
  );

CREATE POLICY "Admins can manage document sections"
  ON public.document_sections FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can manage document sections for draft documents"
  ON public.document_sections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_id
      AND d.status = 'draft'
      AND public.has_role(auth.uid(), 'staff')
    )
  );

CREATE POLICY "Client users can view their document sections"
  ON public.document_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_id
      AND public.user_belongs_to_client(auth.uid(), d.client_id)
    )
  );

-- ===================
-- SIGNATURES POLICIES
-- ===================

CREATE POLICY "CipherX users can view all signatures"
  ON public.signatures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_id
      AND public.is_cipherx_user(auth.uid())
    )
  );

CREATE POLICY "Admins can manage signatures"
  ON public.signatures FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can sign their assigned signatures"
  ON public.signatures FOR UPDATE
  TO authenticated
  USING (signer_id = auth.uid() AND signed_at IS NULL);

CREATE POLICY "Client users can view their document signatures"
  ON public.signatures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_id
      AND public.user_belongs_to_client(auth.uid(), d.client_id)
    )
  );

-- ===================
-- DOCUMENT AUDIT LOG POLICIES
-- ===================

CREATE POLICY "CipherX users can view audit logs"
  ON public.document_audit_log FOR SELECT
  TO authenticated
  USING (public.is_cipherx_user(auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON public.document_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Client users can view their document audit logs"
  ON public.document_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_id
      AND public.user_belongs_to_client(auth.uid(), d.client_id)
    )
  );

-- ===================
-- SUBSCRIPTIONS POLICIES
-- ===================

CREATE POLICY "CipherX users can view all subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (public.is_cipherx_user(auth.uid()));

CREATE POLICY "Admins can manage subscriptions"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Client users can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_client(auth.uid(), client_id));

-- ===================
-- PROJECT FILES POLICIES
-- ===================

CREATE POLICY "CipherX users can view all project files"
  ON public.project_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.is_cipherx_user(auth.uid())
    )
  );

CREATE POLICY "Admins can manage project files"
  ON public.project_files FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can upload project files"
  ON public.project_files FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Client users can view their project files"
  ON public.project_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.user_belongs_to_client(auth.uid(), p.client_id)
    )
  );

-- ===================
-- SERVICE TEMPLATES POLICIES
-- ===================

CREATE POLICY "CipherX users can view service templates"
  ON public.service_templates FOR SELECT
  TO authenticated
  USING (public.is_cipherx_user(auth.uid()));

CREATE POLICY "Admins can manage service templates"
  ON public.service_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ===================
-- INDEXES FOR PERFORMANCE
-- ===================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_client_users_user_id ON public.client_users(user_id);
CREATE INDEX idx_client_users_client_id ON public.client_users(client_id);
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_documents_client_id ON public.documents(client_id);
CREATE INDEX idx_documents_project_id ON public.documents(project_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_document_sections_document_id ON public.document_sections(document_id);
CREATE INDEX idx_signatures_document_id ON public.signatures(document_id);
CREATE INDEX idx_subscriptions_client_id ON public.subscriptions(client_id);
CREATE INDEX idx_project_files_project_id ON public.project_files(project_id);
CREATE INDEX idx_document_audit_log_document_id ON public.document_audit_log(document_id);