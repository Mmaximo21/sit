ALTER TABLE public.work_shift_medical_leaves
  ADD COLUMN IF NOT EXISTS member_name text,
  ADD COLUMN IF NOT EXISTS sector text;

ALTER TABLE public.work_shift_medical_leaves ALTER COLUMN member_id DROP NOT NULL;

UPDATE public.work_shift_medical_leaves l
SET member_name = COALESCE(l.member_name, m.name),
    sector = COALESCE(l.sector, m.sector)
FROM public.work_shift_members m
WHERE m.id = l.member_id;