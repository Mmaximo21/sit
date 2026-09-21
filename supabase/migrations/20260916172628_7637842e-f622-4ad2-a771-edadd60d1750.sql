ALTER TABLE public.work_shift_members DROP CONSTRAINT work_shift_members_sector_check;
ALTER TABLE public.work_shift_members ADD CONSTRAINT work_shift_members_sector_check CHECK (sector = ANY (ARRAY['TRABALHO'::text,'ENFERMAGEM'::text,'ADMINISTRATIVA'::text,'TECNICA'::text]));

ALTER TABLE public.work_schedule_sectors DROP CONSTRAINT work_schedule_sectors_sector_check;
ALTER TABLE public.work_schedule_sectors ADD CONSTRAINT work_schedule_sectors_sector_check CHECK (sector = ANY (ARRAY['TRABALHO'::text,'ENFERMAGEM'::text,'ADMINISTRATIVA'::text,'TECNICA'::text]));

CREATE OR REPLACE FUNCTION private.can_work_schedule(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
  SELECT private.has_role(_user_id, 'master'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.user_tab_permissions
        WHERE user_id = _user_id
          AND tab IN ('escala','escala_enfermagem','escala_administrativa','escala_tecnica')
          AND allowed
      )
$function$;