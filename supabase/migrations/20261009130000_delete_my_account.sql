-- ════════════════════════════════════════════════════════════════════════════
-- Suppression de son propre compte (exigence Google Play « suppression de compte »)
--
-- Chaque utilisateur connecté peut supprimer SON compte depuis l'application (Profil).
-- Effet (cascade déjà définie par les clés étrangères) :
--   • supprimés : compte de connexion, profil, temps d'activité (jour et heure), abonnements ;
--   • anonymisés (user_id → null) : événements de vue, événements publicitaires, présence d'appareil
--     (statistiques agrégées conservées, sans lien avec la personne).
-- Un compte administrateur ne peut pas être supprimé ici (le journal d'audit le référence) :
-- il faut passer par le support. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  if exists (select 1 from public.profiles where id = v_uid and role = 'admin') then
    raise exception 'Un compte administrateur ne peut pas être supprimé depuis l''application. Contactez-nous.'
      using errcode = '42501';
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
