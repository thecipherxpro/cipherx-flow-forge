-- Rename legal_name to ceo_director_name for CEO/Director Full Name
ALTER TABLE public.company_settings RENAME COLUMN legal_name TO ceo_director_name;

-- Add business_number column for Business Number (BIN)
ALTER TABLE public.company_settings ADD COLUMN business_number text;