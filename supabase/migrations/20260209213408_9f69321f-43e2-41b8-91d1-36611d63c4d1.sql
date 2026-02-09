
-- Allow authenticated users to create their own client record during onboarding
CREATE POLICY "Users can create their own client"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Allow authenticated users to link themselves to a client during onboarding
CREATE POLICY "Users can create their own client_user link"
ON public.client_users FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
