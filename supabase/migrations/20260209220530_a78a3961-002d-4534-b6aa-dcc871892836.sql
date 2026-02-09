
-- Recreate with correct search_path syntax
CREATE OR REPLACE FUNCTION public.complete_client_onboarding(
  _company_name text,
  _industry text DEFAULT NULL,
  _website text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _contact_name text DEFAULT NULL,
  _contact_email text DEFAULT NULL,
  _address_line1 text DEFAULT NULL,
  _city text DEFAULT NULL,
  _province text DEFAULT NULL,
  _postal_code text DEFAULT NULL,
  _country text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _client_id uuid;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_role(_user_id, 'client') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF EXISTS (SELECT 1 FROM public.client_users WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'Already onboarded';
  END IF;

  INSERT INTO public.clients (company_name, industry, website, phone, contact_name, contact_email, address_line1, city, province, postal_code, country, created_by)
  VALUES (_company_name, _industry, _website, _phone, _contact_name, _contact_email, _address_line1, _city, _province, _postal_code, _country, _user_id)
  RETURNING id INTO _client_id;

  INSERT INTO public.client_users (user_id, client_id, can_sign_documents)
  VALUES (_user_id, _client_id, true);

  UPDATE public.profiles SET onboarding_completed = true WHERE id = _user_id;

  RETURN _client_id;
END;
$$;
