-- Allow client users to update their own signatures (sign documents)
CREATE POLICY "Client users can sign their own signatures"
ON public.signatures
FOR UPDATE
USING (
  -- User must belong to the client that owns the document
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = signatures.document_id
    AND public.user_belongs_to_client(auth.uid(), d.client_id)
  )
  -- And the signature must be for this user's email
  AND signer_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  -- And the signature hasn't been signed yet
  AND signed_at IS NULL
)
WITH CHECK (
  -- Same conditions for the update check
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = signatures.document_id
    AND public.user_belongs_to_client(auth.uid(), d.client_id)
  )
  AND signer_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);