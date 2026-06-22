-- Realtime Kill Switch (Smart-Stream Ad Matrix) : l'AdOverlay écoute campaigns.
-- Appliquée en prod le 2026-06-22 (projet cvuhvppsdzrjtvrtvrlv).
alter table public.campaigns replica identity full;

drop policy if exists "public read active campaigns" on public.campaigns;
create policy "public read campaigns non-draft" on public.campaigns
  for select to anon, authenticated using (status <> 'draft');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'campaigns'
  ) then
    alter publication supabase_realtime add table public.campaigns;
  end if;
end $$;
