
-- Create trigger to auto-assign client role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, is_approved)
  VALUES (NEW.id, 'client', true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (runs after handle_new_user)
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
