ALTER TABLE public.work_shift_members
  ADD COLUMN IF NOT EXISTS registry_number text,
  ADD COLUMN IF NOT EXISTS work_hours text;