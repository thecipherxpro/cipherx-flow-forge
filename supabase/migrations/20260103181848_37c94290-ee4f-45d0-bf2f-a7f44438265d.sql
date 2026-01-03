-- Add contact fields to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS contact_email text;

-- Add is_approved flag to user_roles table for onboarding workflow
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;

-- Update existing admin/staff roles to be approved by default
UPDATE public.user_roles 
SET is_approved = true 
WHERE role IN ('admin', 'staff');