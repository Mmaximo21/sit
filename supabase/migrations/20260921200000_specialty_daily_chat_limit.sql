-- Migration: Limite de 10 perguntas por dia por especialidade no chat de IA
CREATE TABLE IF NOT EXISTS public.specialty_chat_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specialty TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  question_count INT NOT NULL DEFAULT 0,
  last_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT specialty_chat_usage_spec_date_key UNIQUE (specialty, usage_date)
);

CREATE INDEX IF NOT EXISTS specialty_chat_usage_date_idx ON public.specialty_chat_usage (usage_date, specialty);

GRANT SELECT ON public.specialty_chat_usage TO authenticated;
GRANT ALL ON public.specialty_chat_usage TO service_role;

ALTER TABLE public.specialty_chat_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "specialty_chat_usage_select_auth"
  ON public.specialty_chat_usage
  FOR SELECT
  TO authenticated
  USING (true);

-- Função atômica para verificar e incrementar uso
CREATE OR REPLACE FUNCTION public.check_and_increment_specialty_chat(
  p_specialty TEXT,
  p_user_id UUID DEFAULT NULL,
  p_max_daily INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_current INT := 0;
  v_spec TEXT := COALESCE(NULLIF(TRIM(p_specialty), ''), 'Geral');
BEGIN
  -- Garante existência da linha
  INSERT INTO public.specialty_chat_usage (specialty, usage_date, question_count, last_user_id)
  VALUES (v_spec, v_today, 0, p_user_id)
  ON CONFLICT (specialty, usage_date) DO NOTHING;

  -- Bloqueio para atualização concorrente
  SELECT question_count INTO v_current
  FROM public.specialty_chat_usage
  WHERE specialty = v_spec AND usage_date = v_today
  FOR UPDATE;

  IF v_current >= p_max_daily THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'specialty', v_spec,
      'date', v_today,
      'count', v_current,
      'limit', p_max_daily,
      'remaining', 0
    );
  END IF;

  UPDATE public.specialty_chat_usage
  SET question_count = question_count + 1,
      last_user_id = COALESCE(p_user_id, last_user_id),
      updated_at = now()
  WHERE specialty = v_spec AND usage_date = v_today;

  RETURN jsonb_build_object(
    'allowed', true,
    'specialty', v_spec,
    'date', v_today,
    'count', v_current + 1,
    'limit', p_max_daily,
    'remaining', p_max_daily - (v_current + 1)
  );
END;
$$;

-- Função de leitura da cota atual
CREATE OR REPLACE FUNCTION public.get_specialty_chat_usage(
  p_specialty TEXT,
  p_max_daily INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_current INT := 0;
  v_spec TEXT := COALESCE(NULLIF(TRIM(p_specialty), ''), 'Geral');
BEGIN
  SELECT question_count INTO v_current
  FROM public.specialty_chat_usage
  WHERE specialty = v_spec AND usage_date = v_today;

  IF v_current IS NULL THEN
    v_current := 0;
  END IF;

  RETURN jsonb_build_object(
    'specialty', v_spec,
    'date', v_today,
    'count', v_current,
    'limit', p_max_daily,
    'remaining', GREATEST(0, p_max_daily - v_current),
    'allowed', (v_current < p_max_daily)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_specialty_chat(TEXT, UUID, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_specialty_chat_usage(TEXT, INT) TO authenticated, service_role;
