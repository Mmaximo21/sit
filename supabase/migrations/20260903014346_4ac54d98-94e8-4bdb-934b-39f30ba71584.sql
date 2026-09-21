INSERT INTO public.specialties (name, sort_order, active)
SELECT 'Técnico de Enfermagem', COALESCE(MAX(sort_order), 0) + 1, true
FROM public.specialties
WHERE NOT EXISTS (
  SELECT 1 FROM public.specialties WHERE name = 'Técnico de Enfermagem'
);