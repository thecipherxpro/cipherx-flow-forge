-- Add company description to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN description text DEFAULT '(MSP) IT, Web, Design & Cyber-Security Services';