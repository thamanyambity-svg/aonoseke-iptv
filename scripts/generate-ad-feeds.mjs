#!/usr/bin/env node
// Produit, à partir de public/ads/sectors/sectors.json (écrit par generate-ad-creatives.mjs) :
//   node scripts/generate-ad-feeds.mjs json > public/ads.json                       (secours statique)
//   node scripts/generate-ad-feeds.mjs sql  > supabase/seed-alpha-import-campaigns.sql   (campagnes Supabase)
// Sortie sur stdout uniquement.
import sectors from '../public/ads/sectors/sectors.json' with { type: 'json' };

const SITE = 'https://aonosekehouseinvestmentdrc.site';
const SUPABASE_PUBLIC = 'https://cvuhvppsdzrjtvrtvrlv.supabase.co/storage/v1/object/public/ad-media/sectors';
const LEGAL = 'A.Onoseke House Investment RDC · RCCM CD/KNM/RCCM/21-A-01949 · Siège : Av. Haut Congo n°13, Ngaliema, Kinshasa · contact@aonosekehouseinvestmentdrc.site · +243 999 894 788';
const LEGAL_SHORT = 'RCCM CD/KNM/RCCM/21-A-01949 — Ngaliema, Kinshasa';

const trackUrl = (s, medium) =>
  `${SITE}${s.page}?utm_source=iptv-player&utm_medium=${medium}&utm_campaign=alpha-import-2026&utm_content=sector-${s.id}`;

// Réglages du lecteur (rotation, durée) — modifiables ici.
const PREROLL_SETTINGS = { enabled: true, skipAfter: 5, maxDuration: 12, frequency: 4 };

function toJson() {
  const out = { enabled: true };
  out.preroll = {
    ...PREROLL_SETTINGS,
    items: sectors.map((s) => ({
      id: `sector-${s.id}`, variant: 'souverain', title: s.title, subtitle: s.sub, cta: s.cta,
      image: `/ads/sectors/${s.id}-preroll.jpg`, imagePortrait: `/ads/sectors/${s.id}-portrait.jpg`,
      url: trackUrl(s, 'preroll'), legal: LEGAL,
    })),
  };
  out.banners = sectors.map((s) => ({
    id: `banner-${s.id}`, title: `Alpha Import Exchange — ${s.title}`, subtitle: s.sub,
    image: `/ads/sectors/${s.id}-banner.jpg`, url: trackUrl(s, 'banner'), legal: LEGAL_SHORT,
  }));
  return JSON.stringify(out, null, 2) + '\n';
}

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const titleCase = (t) => t.toLowerCase().replace(/(^|[\s·&-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

function toSql() {
  const lines = [
    '-- Campagnes Alpha Import Exchange : 14 secteurs (8 services + 6 catégories de produits) x pré-roll + bannière.',
    '-- À exécuter dans Supabase → SQL Editor, APRÈS avoir téléversé les images (public/ads/sectors/*.jpg) dans le bucket public `ad-media`, dossier `sectors/`.',
    '-- Idempotent : relancer le script ne crée pas de doublons et met à jour le contenu des campagnes existantes. Fichier généré par scripts/generate-ad-feeds.mjs.',
    '', 'do $$', 'declare adv uuid;', 'begin',
    "  select id into adv from public.advertisers where name = 'Alpha Import Exchange' limit 1;",
    '  if adv is null then',
    '    insert into public.advertisers (name, contact_name, contact_email, phone, status, notes)',
    "    values ('Alpha Import Exchange', 'A.Onoseke House Investment RDC', 'contact@aonosekehouseinvestmentdrc.site', '+243 999 894 788', 'active',",
    "            'Annonceur maison : importation sécurisée Chine, Turquie, Dubaï, Japon, Thaïlande vers la RDC')",
    '    returning id into adv;', '  end if;', '',
  ];
  let n = 0;
  for (const s of sectors) {
    for (const type of ['preroll', 'banner']) {
      const content = {
        title: s.title, subtitle: s.sub, cta: s.cta, url: trackUrl(s, type), legal: LEGAL, variant: 'souverain',
        image: `${SUPABASE_PUBLIC}/${s.id}-${type}.jpg`,
        ...(type === 'preroll' ? { imagePortrait: `${SUPABASE_PUBLIC}/${s.id}-portrait.jpg` } : {}),
      };
      const name = `Alpha Import — ${titleCase(s.eyebrow)} (${type})`;
      lines.push(
        '  insert into public.campaigns (advertiser_id, name, type, content, status, weight)',
        `  select adv, ${q(name)}, ${q(type)}, ${q(JSON.stringify(content))}::jsonb, 'active', 10`,
        `  where not exists (select 1 from public.campaigns where advertiser_id = adv and name = ${q(name)});`,
        // Met à jour le contenu si la campagne existait déjà (nouveaux visuels, version verticale…)
        `  update public.campaigns set content = ${q(JSON.stringify(content))}::jsonb, updated_at = now() where advertiser_id = adv and name = ${q(name)};`,
      );
      n += 1;
    }
  }
  lines.push('end $$;', '', `-- Vérification : doit afficher ${n} lignes`,
    "select c.name, c.type, c.status from public.campaigns c join public.advertisers a on a.id = c.advertiser_id where a.name = 'Alpha Import Exchange' order by c.name;");
  return lines.join('\n') + '\n';
}

const mode = process.argv[2];
if (mode === 'json') process.stdout.write(toJson());
else if (mode === 'sql') process.stdout.write(toSql());
else { console.error('Usage : node scripts/generate-ad-feeds.mjs <json|sql>'); process.exit(1); }
