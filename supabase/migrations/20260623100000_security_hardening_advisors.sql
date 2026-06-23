-- Durcissement sécurité (advisors Supabase) — 2026-06-23.
-- Ne touche PAS à l'archi RPC (security definer + check is_admin() interne reste valide).
-- Appliquée en prod le 2026-06-23 (projet cvuhvppsdzrjtvrtvrlv).

-- (1) 2 vues exposées en SELECT à anon et exécutées en SECURITY DEFINER → elles
--     contournaient la RLS des tables sous-jacentes (fuite latente dès le 1er ad/view_event).
--     Aucune n'est lue par le code → passage en security_invoker : la RLS du lecteur s'applique.
alter view if exists public.ad_attribution set (security_invoker = on);
alter view if exists public.ad_stats       set (security_invoker = on);

-- (2) Fonctions de l'ancien système publicitaire dormant (ad_campaigns*) : search_path
--     fixe pour éviter tout détournement (search_path mutable). Comportement inchangé.
alter function public.check_ad_campaign_limits()                                   set search_path = public;
alter function public.get_active_ad_campaigns()                                    set search_path = public;
alter function public.log_ad_matrix_event(bigint, character varying, integer, jsonb) set search_path = public;

-- NB hors-SQL (action humaine, dashboard Supabase) : activer "Leaked password protection"
--    (Auth > Policies). Le bucket public `ad-media` reste public en lecture (assets pub
--    servis au lecteur) — risque de listing accepté car contenu déjà public.
