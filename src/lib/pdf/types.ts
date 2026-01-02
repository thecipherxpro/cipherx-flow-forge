export interface DocumentSection {
  key: string;
  title: string;
  content: string;
  isRequired: boolean;
}

export interface PricingItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Signature {
  id: string;
  signer_name: string;
  signer_email: string;
  signer_role: string;
  signed_at: string | null;
  is_required: boolean;
  signature_data: string | null;
  ip_address: string | null;
  location_data: {
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  } | null;
  user_agent: string | null;
}

export interface CompanySettings {
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
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  footer_text: string | null;
  tax_number: string | null;
}

export interface ClientContact {
  full_name: string;
  email: string;
  job_title: string | null;
}

export interface DocumentData {
  id: string;
  title: string;
  document_type: string;
  service_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  version: number;
  compliance_confirmed: boolean;
  clients?: {
    company_name: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country?: string;
    phone?: string;
  };
}

export interface PricingData {
  items?: PricingItem[];
  subtotal?: number;
  discountAmount?: number;
  discountPercent?: number;
  total?: number;
}

export interface PdfGeneratorOptions {
  document: DocumentData;
  sections: DocumentSection[];
  pricingData: PricingData;
  pricingItems: PricingItem[];
  signatures: Signature[];
  companySettings: CompanySettings | null;
  clientContact: ClientContact | null;
}

export const documentTypeLabels: Record<string, string> = {
  proposal: 'Proposal',
  contract: 'Contract',
  sla: 'Service Level Agreement'
};

export const documentTypePrefixes: Record<string, string> = {
  proposal: 'PROP',
  contract: 'CONT',
  sla: 'SLA'
};

export const serviceTypeLabels: Record<string, string> = {
  website_pwa_build: 'Website & PWA Build',
  website_only: 'Website Only',
  pwa_only: 'PWA Only',
  cybersecurity: 'Cybersecurity',
  graphic_design: 'Graphic Design'
};
