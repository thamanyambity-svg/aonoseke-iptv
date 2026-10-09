-- Campagnes Alpha Import Exchange : 14 secteurs (8 services + 6 catégories de produits) x pré-roll + bannière.
-- À exécuter dans Supabase → SQL Editor. Les visuels sont ceux du site (/ads/sectors/*.jpg) : aucun téléversement nécessaire.
-- Idempotent : relancer le script ne crée pas de doublons et met à jour le contenu des campagnes existantes. Fichier généré par scripts/generate-ad-feeds.mjs.

do $$
declare adv uuid;
begin
  select id into adv from public.advertisers where name = 'Alpha Import Exchange' limit 1;
  if adv is null then
    insert into public.advertisers (name, contact_name, contact_email, phone, status, notes)
    values ('Alpha Import Exchange', 'A.Onoseke House Investment RDC', 'contact@aonosekehouseinvestmentdrc.site', '+243 999 894 788', 'active',
            'Annonceur maison : importation sécurisée Chine, Turquie, Dubaï, Japon, Thaïlande vers la RDC')
    returning id into adv;
  end if;

  create temp table _alpha_campaigns on commit drop as
  select
    'Alpha Import — ' || s.label || ' (' || t.type || ')' as name,
    t.type,
    jsonb_build_object(
      'title', s.title, 'subtitle', s.sub, 'cta', s.cta,
      'url', 'https://aonosekehouseinvestmentdrc.site' || s.page || '?utm_source=iptv-player&utm_medium=' || t.type || '&utm_campaign=alpha-import-2026&utm_content=sector-' || s.id,
      'legal', 'A.Onoseke House Investment RDC · RCCM CD/KNM/RCCM/21-A-01949 · Siège : Av. Haut Congo n°13, Ngaliema, Kinshasa · contact@aonosekehouseinvestmentdrc.site · +243 999 894 788', 'variant', 'souverain',
      'image', '/ads/sectors/' || s.id || '-' || t.type || '.jpg'
    ) || case when t.type = 'preroll' then
      jsonb_build_object('imagePortrait', '/ads/sectors/' || s.id || '-portrait.jpg') else '{}'::jsonb end as content
  from (values
    ('sourcing', 'Sourcing & Achats', 'Achetez directement à la source', 'Fournisseurs vérifiés en Chine, Turquie, Dubaï, Japon et Thaïlande.', 'Demander un devis', '/register'),
    ('maritime', 'Fret Maritime', 'Vos conteneurs, de l''Asie à Kinshasa', 'Un suivi complet, de l''embarquement à la livraison.', 'Voir le circuit', '/how-it-works'),
    ('aerien', 'Fret Aérien', 'Urgent ? Livré par avion', 'Des délais maîtrisés pour vos marchandises sensibles.', 'Demander un devis', '/contact'),
    ('douane', 'Dédouanement Kinshasa', 'La douane sans casse-tête', 'Commissionnaires agréés, dossier complet, circuit maîtrisé.', 'Comment ça marche', '/how-it-works'),
    ('qualite', 'Contrôle Qualité', 'Vérifié avant de partir', 'Inspection avant expédition et rapport photo.', 'En savoir plus', '/services'),
    ('securise', 'Paiement Sécurisé 60/40', 'Ne payez le solde qu''à réception', '60 % sur compte séquestre, 40 % à la livraison conforme.', 'Comment ça marche', '/how-it-works'),
    ('financement', 'Financement Trade', 'Financez vos achats à l’international', 'Préfinancement, crédit documentaire, assurance-crédit.', 'Nous contacter', '/contact'),
    ('conseil', 'Conseil & Accompagnement', 'Un dossier d’import solide', 'Étude de faisabilité, fiscalité et douane.', 'Parler à un conseiller', '/contact'),
    ('electronique', 'Import · Électronique', 'TV, téléphones, électroménager', 'Achetés à la source, contrôlés avant expédition, livrés à Kinshasa.', 'Demander un devis', '/register'),
    ('btp', 'Import · Matériaux De Construction', 'Équipez vos chantiers', 'Carrelage, sanitaires, quincaillerie : du sourcing à la livraison.', 'Demander un devis', '/register'),
    ('auto', 'Import · Pièces Auto & Motos', 'Des pièces fiables, sans surprise', 'Contrôle avant expédition et suivi jusqu’à Kinshasa.', 'Demander un devis', '/register'),
    ('textile', 'Import · Textile & Mode', 'Habillez votre boutique', 'Tissus, vêtements, accessoires : sourcing en Chine, Turquie et Thaïlande.', 'Demander un devis', '/register'),
    ('solaire', 'Import · Énergie Solaire', 'L’énergie qui ne s’arrête pas', 'Panneaux, onduleurs, batteries : importés avec contrôle qualité.', 'Demander un devis', '/register'),
    ('machines', 'Import · Machines & Équipements', 'Équipez votre activité', 'Machines, outils et équipements : du sourcing au dédouanement.', 'Demander un devis', '/register')
  ) as s(id, label, title, sub, cta, page)
  cross join (values ('preroll'), ('banner')) as t(type);

  insert into public.campaigns (advertiser_id, name, type, content, status, weight)
  select adv, a.name, a.type, a.content, 'active', 10 from _alpha_campaigns a
  where not exists (select 1 from public.campaigns c where c.advertiser_id = adv and c.name = a.name);

  -- Met à jour le contenu si la campagne existait déjà (nouveaux visuels, version verticale…)
  update public.campaigns c set content = a.content, updated_at = now()
  from _alpha_campaigns a where c.advertiser_id = adv and c.name = a.name;
end $$;

-- Vérification : doit afficher 28 lignes
select c.name, c.type, c.status from public.campaigns c join public.advertisers a on a.id = c.advertiser_id where a.name = 'Alpha Import Exchange' order by c.name;
