ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS admission_date date,
  ADD COLUMN IF NOT EXISTS diagnosis text;