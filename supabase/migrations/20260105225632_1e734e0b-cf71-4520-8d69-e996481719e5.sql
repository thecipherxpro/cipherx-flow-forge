-- Allow client users to update document status to 'signed' when they complete signature
CREATE POLICY "Client users can update document status to signed"
ON public.documents
FOR UPDATE
USING (
  user_belongs_to_client(auth.uid(), client_id)
  AND status = 'sent'
)
WITH CHECK (
  user_belongs_to_client(auth.uid(), client_id)
  AND status = 'signed'
);