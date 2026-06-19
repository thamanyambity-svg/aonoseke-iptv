-- ════════════════════════════════════════════════════════════════
-- Smart-Stream Ad Matrix — Schéma Isolated (V1)
-- Date: 2026-06-19
-- ISOLATION TOTALE : Aucune modification des tables existantes
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. TABLE: ad_campaigns (Campagnes publicitaires B2B simples)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id BIGSERIAL PRIMARY KEY,
  client_name VARCHAR(255) NOT NULL,
  ad_type VARCHAR(20) NOT NULL CHECK (ad_type IN ('banner', 'video', 'image')),
  media_url TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_duration_per_day_mins INT NOT NULL DEFAULT 0,
  target_impressions INT NOT NULL DEFAULT 0,
  target_clicks INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'draft')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON public.ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_dates ON public.ad_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_created_by ON public.ad_campaigns(created_by);

COMMENT ON TABLE public.ad_campaigns IS 'Campagnes publicitaires B2B simple avec métadonnées et limites (Smart-Stream Ad Matrix)';
COMMENT ON COLUMN public.ad_campaigns.max_duration_per_day_mins IS 'Durée max de diffusion par jour (0 = illimité)';
COMMENT ON COLUMN public.ad_campaigns.target_impressions IS 'Impressions cibles pour auto-stop (0 = illimité)';
COMMENT ON COLUMN public.ad_campaigns.target_clicks IS 'Clics cibles pour auto-stop (0 = illimité)';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. TABLE: ad_performance_logs (Logs quotidiens agrégés)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ad_performance_logs (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  daily_impressions INT NOT NULL DEFAULT 0,
  daily_clicks INT NOT NULL DEFAULT 0,
  daily_duration_mins FLOAT NOT NULL DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(campaign_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_ad_logs_campaign ON public.ad_performance_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_logs_date ON public.ad_performance_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_ad_logs_campaign_date ON public.ad_performance_logs(campaign_id, log_date);

COMMENT ON TABLE public.ad_performance_logs IS 'Logs quotidiens d''agrégation pour tracking et rapports (Smart-Stream)';

-- ─────────────────────────────────────────────────────────────────────────
-- 3. TABLE: ad_impressions (Tracking brut - optionnel pour audit)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ad_impressions (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('impression', 'click', 'duration')),
  event_data JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ad_impressions_campaign ON public.ad_impressions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_date ON public.ad_impressions(created_at);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_event ON public.ad_impressions(event_type);

COMMENT ON TABLE public.ad_impressions IS 'Log détaillé d''événements publicitaires (audit, Smart-Stream)';

-- ─────────────────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS) — Admin uniquement
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

-- Politique : Admin uniquement pour les campagnes
DROP POLICY IF EXISTS "Admin can manage ad_campaigns" ON public.ad_campaigns;
CREATE POLICY "Admin can manage ad_campaigns"
  ON public.ad_campaigns
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Politique : Admin uniquement pour les logs
DROP POLICY IF EXISTS "Admin can view ad_performance_logs" ON public.ad_performance_logs;
CREATE POLICY "Admin can view ad_performance_logs"
  ON public.ad_performance_logs
  FOR SELECT
  USING (public.is_admin());

-- Politique : Insertion des logs publique (depuis API)
DROP POLICY IF EXISTS "Service role can insert ad_performance_logs" ON public.ad_performance_logs;
CREATE POLICY "Service role can insert ad_performance_logs"
  ON public.ad_performance_logs
  FOR INSERT
  WITH CHECK (true);

-- Politique : Admin uniquement pour l'audit d'impressions
DROP POLICY IF EXISTS "Admin can view ad_impressions" ON public.ad_impressions;
CREATE POLICY "Admin can view ad_impressions"
  ON public.ad_impressions
  FOR SELECT
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 5. FONCTION RPC: Fetch campagnes actives (pour le client/player)
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_active_ad_campaigns()
RETURNS TABLE (
  id BIGINT,
  client_name VARCHAR,
  ad_type VARCHAR,
  media_url TEXT,
  max_duration_per_day_mins INT,
  remaining_impressions INT,
  remaining_clicks INT
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT
    c.id,
    c.client_name,
    c.ad_type,
    c.media_url,
    c.max_duration_per_day_mins,
    GREATEST(0, COALESCE(c.target_impressions, 0) - COALESCE((
      SELECT SUM(daily_impressions) FROM public.ad_performance_logs
      WHERE campaign_id = c.id
    ), 0)) AS remaining_impressions,
    GREATEST(0, COALESCE(c.target_clicks, 0) - COALESCE((
      SELECT SUM(daily_clicks) FROM public.ad_performance_logs
      WHERE campaign_id = c.id
    ), 0)) AS remaining_clicks
  FROM public.ad_campaigns c
  WHERE c.status = 'active'
    AND c.start_date <= CURRENT_TIMESTAMP
    AND c.end_date >= CURRENT_TIMESTAMP
  ORDER BY c.created_at DESC;
$$;

COMMENT ON FUNCTION public.get_active_ad_campaigns() IS
'Retourne les campagnes actives avec impressions/clics restants (Smart-Stream). Accessible au player.';

-- ─────────────────────────────────────────────────────────────────────────
-- 6. FONCTION RPC: Log un événement (impression, clic, durée)
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_ad_matrix_event(
  p_campaign_id BIGINT,
  p_event_type VARCHAR,
  p_duration_secs INT DEFAULT NULL,
  p_device_info JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_date DATE;
BEGIN
  v_log_date := CURRENT_DATE;
  
  -- Insérer dans ad_impressions (log brut)
  INSERT INTO public.ad_impressions (campaign_id, event_type, event_data)
  VALUES (p_campaign_id, p_event_type, jsonb_build_object(
    'device', COALESCE(p_device_info->>'device', 'unknown'),
    'duration_secs', p_duration_secs,
    'timestamp', CURRENT_TIMESTAMP
  ));
  
  -- Upsert dans ad_performance_logs (agrégation quotidienne)
  INSERT INTO public.ad_performance_logs (campaign_id, log_date, daily_impressions, daily_clicks, daily_duration_mins)
  VALUES (
    p_campaign_id,
    v_log_date,
    CASE WHEN p_event_type = 'impression' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'click' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'duration' AND p_duration_secs IS NOT NULL THEN p_duration_secs::FLOAT / 60.0 ELSE 0.0 END
  )
  ON CONFLICT (campaign_id, log_date)
  DO UPDATE SET
    daily_impressions = daily_impressions + EXCLUDED.daily_impressions,
    daily_clicks = daily_clicks + EXCLUDED.daily_clicks,
    daily_duration_mins = daily_duration_mins + EXCLUDED.daily_duration_mins,
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.log_ad_matrix_event(BIGINT, VARCHAR, INT, JSONB) IS
'Log un événement pub (impression, clic, durée). Appel depuis le player client.';

-- ─────────────────────────────────────────────────────────────────────────
-- 7. TRIGGER: Auto-stop des campagnes (Kill Switch)
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_ad_campaign_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_impressions INT;
  v_total_clicks INT;
  v_campaign_id BIGINT;
BEGIN
  v_campaign_id := NEW.campaign_id;
  
  -- Calculer les totaux pour cette campagne
  SELECT
    COALESCE(SUM(daily_impressions), 0),
    COALESCE(SUM(daily_clicks), 0)
  INTO v_total_impressions, v_total_clicks
  FROM public.ad_performance_logs
  WHERE campaign_id = v_campaign_id;
  
  -- Vérifier les conditions de stop (kill switch)
  IF EXISTS (
    SELECT 1 FROM public.ad_campaigns
    WHERE id = v_campaign_id
      AND (
        (target_impressions > 0 AND v_total_impressions >= target_impressions)
        OR (target_clicks > 0 AND v_total_clicks >= target_clicks)
        OR (CURRENT_TIMESTAMP > end_date)
      )
  ) THEN
    UPDATE public.ad_campaigns
    SET status = 'completed', updated_at = CURRENT_TIMESTAMP
    WHERE id = v_campaign_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger après insertion/update dans ad_performance_logs
DROP TRIGGER IF EXISTS trg_check_ad_campaign_limits ON public.ad_performance_logs;
CREATE TRIGGER trg_check_ad_campaign_limits
AFTER INSERT OR UPDATE ON public.ad_performance_logs
FOR EACH ROW
EXECUTE FUNCTION public.check_ad_campaign_limits();

-- ─────────────────────────────────────────────────────────────────────────
-- 8. VUE MATÉRIALISÉE : Reporting commercial
-- ─────────────────────────────────────────────────────────────────────────

CREATE MATERIALIZED VIEW IF NOT EXISTS public.ad_campaign_stats AS
SELECT
  c.id,
  c.client_name,
  c.ad_type,
  c.status,
  c.start_date,
  c.end_date,
  c.target_impressions,
  c.target_clicks,
  COALESCE(SUM(l.daily_impressions), 0) AS total_impressions,
  COALESCE(SUM(l.daily_clicks), 0) AS total_clicks,
  COALESCE(SUM(l.daily_duration_mins), 0) AS total_duration_mins,
  CASE
    WHEN COALESCE(SUM(l.daily_impressions), 0) > 0
    THEN ROUND(100.0 * COALESCE(SUM(l.daily_clicks), 0)::NUMERIC / COALESCE(SUM(l.daily_impressions), 0), 2)
    ELSE 0
  END AS ctr_percent,
  COUNT(DISTINCT l.log_date) AS days_active
FROM public.ad_campaigns c
LEFT JOIN public.ad_performance_logs l ON c.id = l.campaign_id
GROUP BY c.id, c.client_name, c.ad_type, c.status, c.start_date, c.end_date, c.target_impressions, c.target_clicks;

COMMENT ON MATERIALIZED VIEW public.ad_campaign_stats IS
'Vue agrégée pour rapports commerciaux (impressions, clics, CTR, Smart-Stream)';

CREATE INDEX IF NOT EXISTS idx_stats_client ON public.ad_campaign_stats(client_name);
CREATE INDEX IF NOT EXISTS idx_stats_status ON public.ad_campaign_stats(status);

-- ─────────────────────────────────────────────────────────────────────────
-- 9. FONCTION RPC ADMIN: Lister les campagnes publicitaires
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_list_ad_campaigns()
RETURNS TABLE (
  id BIGINT,
  client_name VARCHAR,
  ad_type VARCHAR,
  media_url TEXT,
  status VARCHAR,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  target_impressions INT,
  target_clicks INT,
  total_impressions BIGINT,
  total_clicks BIGINT,
  ctr_percent NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : administrateur requis' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.client_name,
    s.ad_type,
    c.media_url,
    s.status,
    c.start_date,
    c.end_date,
    s.target_impressions,
    s.target_clicks,
    s.total_impressions,
    s.total_clicks,
    s.ctr_percent,
    c.created_at
  FROM public.ad_campaign_stats s
  JOIN public.ad_campaigns c ON c.id = s.id
  ORDER BY c.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.admin_list_ad_campaigns() IS
'Lister toutes les campagnes avec stats agrégées (Admin uniquement, Smart-Stream)';

-- ─────────────────────────────────────────────────────────────────────────
-- 10. FONCTION RPC ADMIN: Créer une campagne
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_create_ad_campaign(
  p_client_name VARCHAR,
  p_ad_type VARCHAR,
  p_media_url TEXT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_max_duration_per_day_mins INT DEFAULT 0,
  p_target_impressions INT DEFAULT 0,
  p_target_clicks INT DEFAULT 0
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_new_id BIGINT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : administrateur requis' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.ad_campaigns (
    client_name, ad_type, media_url, start_date, end_date,
    max_duration_per_day_mins, target_impressions, target_clicks,
    created_by, status
  )
  VALUES (
    p_client_name, p_ad_type, p_media_url, p_start_date, p_end_date,
    p_max_duration_per_day_mins, p_target_impressions, p_target_clicks,
    auth.uid(), 'draft'
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

COMMENT ON FUNCTION public.admin_create_ad_campaign(VARCHAR, VARCHAR, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INT, INT, INT) IS
'Créer une nouvelle campagne publicitaire (Admin uniquement, Smart-Stream)';

-- ─────────────────────────────────────────────────────────────────────────
-- 11. FONCTION RPC ADMIN: Modifier une campagne
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_update_ad_campaign(
  p_id BIGINT,
  p_status VARCHAR DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : administrateur requis' USING ERRCODE = '42501';
  END IF;

  UPDATE public.ad_campaigns
  SET
    status = COALESCE(p_status, status),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_id;
END;
$$;

COMMENT ON FUNCTION public.admin_update_ad_campaign(BIGINT, VARCHAR) IS
'Mettre à jour une campagne (ex: activation/pause, Admin uniquement)';

-- ─────────────────────────────────────────────────────────────────────────
-- 12. FONCTION RPC: Générer rapport commercial (Annonceur)
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_ad_campaign_report(
  p_campaign_id BIGINT,
  p_from_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_to_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  log_date DATE,
  daily_impressions INT,
  daily_clicks INT,
  daily_duration_mins FLOAT,
  ctr_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : administrateur requis' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    l.log_date,
    l.daily_impressions,
    l.daily_clicks,
    l.daily_duration_mins,
    CASE WHEN l.daily_impressions > 0
      THEN ROUND(100.0 * l.daily_clicks::NUMERIC / l.daily_impressions, 2)
      ELSE 0::NUMERIC
    END AS ctr_percent
  FROM public.ad_performance_logs l
  WHERE l.campaign_id = p_campaign_id
    AND l.log_date >= p_from_date
    AND l.log_date <= p_to_date
  ORDER BY l.log_date DESC;
END;
$$;

COMMENT ON FUNCTION public.admin_ad_campaign_report(BIGINT, DATE, DATE) IS
'Générer rapport détaillé jour par jour pour une campagne (Admin uniquement)';

-- ════════════════════════════════════════════════════════════════
-- FIN Smart-Stream Ad Matrix — Schéma Isolated
-- ════════════════════════════════════════════════════════════════
