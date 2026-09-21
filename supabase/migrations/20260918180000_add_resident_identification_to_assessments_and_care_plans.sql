-- Adiciona colunas de identificação do residente (data de acolhimento e diagnóstico)
-- às tabelas assessments e care_plans, puxando os dados cadastrados no admin.

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS admission_date DATE,
  ADD COLUMN IF NOT EXISTS diagnosis TEXT;

ALTER TABLE public.care_plans
  ADD COLUMN IF NOT EXISTS admission_date DATE,
  ADD COLUMN IF NOT EXISTS diagnosis TEXT;
