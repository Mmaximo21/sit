ALTER TABLE public.work_shift_medical_leaves DROP CONSTRAINT IF EXISTS dates_check;
ALTER TABLE public.work_shift_medical_leaves ALTER COLUMN end_date DROP NOT NULL;