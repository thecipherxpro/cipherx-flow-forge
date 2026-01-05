-- Add position column to signatures table for signer job title/position
ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS position text;