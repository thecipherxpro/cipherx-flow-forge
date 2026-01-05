-- Allow client users to view company settings (needed for PDF export)
CREATE POLICY "Client users can view company settings"
ON public.company_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_users 
    WHERE user_id = auth.uid()
  )
);