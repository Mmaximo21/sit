ALTER TABLE public.work_shift_members DROP CONSTRAINT work_shift_members_shift_check;
ALTER TABLE public.work_shift_members ADD CONSTRAINT work_shift_members_shift_check CHECK (shift = ANY (ARRAY['SD1','SD2','SD3','SD4','DIARISTA']));
ALTER TABLE public.work_shift_rotations DROP CONSTRAINT work_shift_rotations_to_shift_check;
ALTER TABLE public.work_shift_rotations ADD CONSTRAINT work_shift_rotations_to_shift_check CHECK (to_shift = ANY (ARRAY['SD1','SD2','SD3','SD4','DIARISTA']));