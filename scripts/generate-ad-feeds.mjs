#!/usr/bin/env node
// Produit, à partir de public/ads/sectors/sectors.json (écrit par generate-ad-creatives.mjs) :
//   node scripts/generate-ad-feeds.mjs json > public/ads.json                       (secours statique)
//   node scripts/generate-ad-feeds.mjs sql  > supabase/seed-alpha-import-campaigns.sql   (campagnes Supabase)
// Sortie sur stdout uniquement.
import sectors from '../public/ads/sectors/sectors.json' with { type: 'json' };

const SITE = 'https://aonosekehouseinvestmentdrc.site';
// Les visuels sont servis par le site lui-même (public/ads/sectors) : même source que ads.json, aucun stockage à téléverser.
const IMG_BASE = '/ads/sectors';
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
  const rows = sectors
    .map((s) => `    (${[s.id, titleCase(s.eyebrow), s.title, s.sub, s.cta, s.page].map(q).join(', ')})`)
    .join(',\n');
  const n = sectors.length * 2;
  return [
    '-- Campagnes Alpha Import Exchange : 14 secteurs (8 services + 6 catégories de produits) x pré-roll + bannière.',
    '-- À exécuter dans Supabase → SQL Editor. Les visuels sont ceux du site (/ads/sectors/*.jpg) : aucun téléversement nécessaire.',
    '-- Idempotent : relancer le script ne crée pas de doublons et met à jour le contenu des campagnes existantes. Fichier généré par scripts/generate-ad-feeds.mjs.',
    '',
    'do $$',
    'declare adv uuid;',
    'begin',
    "  select id into adv from public.advertisers where name = 'Alpha Import Exchange' limit 1;",
    '  if adv is null then',
    '    insert into public.advertisers (name, contact_name, contact_email, phone, status, notes)',
    "    values ('Alpha Import Exchange', 'A.Onoseke House Investment RDC', 'contact@aonosekehouseinvestmentdrc.site', '+243 999 894 788', 'active',",
    "            'Annonceur maison : importation sécurisée Chine, Turquie, Dubaï, Japon, Thaïlande vers la RDC')",
    '    returning id into adv;',
    '  end if;',
    '',
    '  create temp table _alpha_campaigns on commit drop as',
    '  select',
    "    'Alpha Import — ' || s.label || ' (' || t.type || ')' as name,",
    '    t.type,',
    '    jsonb_build_object(',
    "      'title', s.title, 'subtitle', s.sub, 'cta', s.cta,",
    `      'url', ${q(SITE)} || s.page || '?utm_source=iptv-player&utm_medium=' || t.type || '&utm_campaign=alpha-import-2026&utm_content=sector-' || s.id,`,
    `      'legal', ${q(LEGAL)}, 'variant', 'souverain',`,
    `      'image', ${q(IMG_BASE + '/')} || s.id || '-' || t.type || '.jpg'`,
    '    ) || case when t.type = \'preroll\' then',
    `      jsonb_build_object('imagePortrait', ${q(IMG_BASE + '/')} || s.id || '-portrait.jpg') else '{}'::jsonb end as content`,
    '  from (values',
    rows,
    '  ) as s(id, label, title, sub, cta, page)',
    "  cross join (values ('preroll'), ('banner')) as t(type);",
    '',
    '  insert into public.campaigns (advertiser_id, name, type, content, status, weight)',
    "  select adv, a.name, a.type, a.content, 'active', 10 from _alpha_campaigns a",
    '  where not exists (select 1 from public.campaigns c where c.advertiser_id = adv and c.name = a.name);',
    '',
    '  -- Met à jour le contenu si la campagne existait déjà (nouveaux visuels, version verticale…)',
    '  update public.campaigns c set content = a.content, updated_at = now()',
    '  from _alpha_campaigns a where c.advertiser_id = adv and c.name = a.name;',
    'end $$;',
    '',
    `-- Vérification : doit afficher ${n} lignes`,
    "select c.name, c.type, c.status from public.campaigns c join public.advertisers a on a.id = c.advertiser_id where a.name = 'Alpha Import Exchange' order by c.name;",
    '',
  ].join('\n');
}

const mode = process.argv[2];
if (mode === 'json') process.stdout.write(toJson());
else if (mode === 'sql') process.stdout.write(toSql());
else { console.error('Usage : node scripts/generate-ad-feeds.mjs <json|sql>'); process.exit(1); }
