/**
 * Régie IA — conteneur principal.
 *
 * Compose : zone de dépôt + assistant IA (AIPromptBar) → carte de validation
 * (CampaignDraftCard) → grille calendrier (CampaignCalendar).
 *
 * Branché sur les hooks existants `useAdvertisers` / `useCampaigns` (RPC Supabase).
 * À la validation, on tente la création réelle (RPC) ET on ajoute le bloc en
 * optimiste pour un retour visuel immédiat — même hors backend (mode aperçu).
 *
 * @component AiAdCalendar
 */
import { useMemo, useState } from 'react';
import type { JSX } from 'react';
import { CalendarClock, CheckCircle2 } from 'lucide-react';
import './regie.css';
import { useAdvertisers } from '../../hooks/useAdvertisers.ts';
import { useCampaigns } from '../../hooks/useCampaigns.ts';
import { AIPromptBar } from './AIPromptBar.tsx';
import { CampaignDraftCard } from './CampaignDraftCard.tsx';
import { CampaignCalendar, type RegieEvent } from './CampaignCalendar.tsx';
import type { CampaignDraft } from '../../utils/parseCampaignPrompt.ts';
import type { Campaign } from '../../hooks/useCampaigns.ts';

const PALETTE = ['#c9a84c', '#E24B4A', '#1D9E75', '#378ADD', '#7F77DD', '#D85A30'];
const BRAND_COLORS: Record<string, string> = { vodacom: '#E24B4A', orange: '#D85A30', airtel: '#E24B4A', 'alpha import': '#c9a84c', africell: '#7F77DD' };

function colorFor(name: string): string {
  const key = name.trim().toLowerCase();
  for (const brand in BRAND_COLORS) if (key.includes(brand)) return BRAND_COLORS[brand];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function atHour(day: Date, hour: number): Date {
  const d = new Date(day);
  d.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
  return d;
}

/** Déplie une campagne en blocs quotidiens selon sa plage horaire (dayparting). */
function expand(c: Campaign): RegieEvent[] {
  const color = colorFor(c.advertiser_name || c.name);
  const start = new Date(c.start_at);
  const end = c.end_at ? new Date(c.end_at) : new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const dp = c.content?.daypart;
  const out: RegieEvent[] = [];
  const cursor = new Date(start); cursor.setHours(0, 0, 0, 0);
  let guard = 0;
  while (cursor <= end && guard < 120) {
    guard++;
    const s = dp ? atHour(cursor, dp.startHour) : atHour(cursor, 8);
    const e = dp ? atHour(cursor, dp.endHour) : atHour(cursor, 20);
    out.push({
      id: `${c.id}:${cursor.toISOString().slice(0, 10)}`,
      campaignId: c.id,
      title: c.advertiser_name || c.name,
      start: s.toISOString(),
      end: e.toISOString(),
      color,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

let optimisticSeq = 0;

interface AiAdCalendarProps {
  /** true = page plein écran (point d'entrée preview /#regie). */
  standalone?: boolean;
}

export function AiAdCalendar({ standalone }: AiAdCalendarProps): JSX.Element {
  const adv = useAdvertisers();
  const camp = useCampaigns();

  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [local, setLocal] = useState<Campaign[]>([]);

  const advertiserNames = useMemo(
    () => adv.advertisers.map((a) => a.name),
    [adv.advertisers],
  );

  const events = useMemo<RegieEvent[]>(
    () => [...camp.campaigns, ...local].flatMap(expand),
    [camp.campaigns, local],
  );

  function draftToCampaign(d: CampaignDraft, id: string): Campaign {
    return {
      id,
      advertiser_id: id,
      advertiser_name: d.advertiserName,
      name: d.title,
      type: d.type,
      content: {
        title: d.title,
        variant: 'souverain',
        daypart: d.daypart,
        ...(d.format === 'video' && d.media?.url ? { video: d.media.url } : {}),
        ...(d.format === 'image' && d.media?.url ? { image: d.media.url } : {}),
      },
      start_at: d.startDate,
      end_at: d.endDate,
      target_countries: [],
      target_categories: [],
      impression_cap: d.impressionCap,
      click_cap: null,
      frequency_cap_per_user: 4,
      weight: 10,
      status: 'active',
      created_at: new Date().toISOString(),
      impressions: 0,
      clicks: 0,
      ctr: 0,
    };
  }

  async function confirm(): Promise<void> {
    if (!draft) return;
    setBusy(true);
    const localId = `local-${++optimisticSeq}`;
    // Retour visuel immédiat (optimiste).
    setLocal((prev) => [...prev, draftToCampaign(draft, localId)]);

    // Tentative de persistance réelle via RPC (best-effort).
    try {
      let advertiserId = adv.advertisers.find(
        (a) => a.name.trim().toLowerCase() === draft.advertiserName.trim().toLowerCase(),
      )?.id;
      if (!advertiserId) {
        const created = await adv.create({ name: draft.advertiserName });
        advertiserId = created.id;
      }
      if (advertiserId) {
        await camp.create({
          advertiser_id: advertiserId,
          name: draft.title,
          type: draft.type,
          content: draftToCampaign(draft, localId).content,
          start_at: draft.startDate,
          end_at: draft.endDate,
          impression_cap: draft.impressionCap,
          frequency_cap_per_user: 4,
          weight: 10,
        });
        setToast(`Campagne « ${draft.advertiserName} » enregistrée et programmée.`);
      } else {
        setToast(`Campagne « ${draft.advertiserName} » ajoutée au calendrier (aperçu local).`);
      }
    } catch {
      setToast(`Campagne « ${draft.advertiserName} » ajoutée au calendrier (aperçu local).`);
    } finally {
      setBusy(false);
      setDraft(null);
      window.setTimeout(() => setToast(null), 5000);
    }
  }

  function reschedule(campaignId: string, start: Date, end: Date): void {
    const dp = { startHour: start.getHours(), endHour: end.getHours() || 24 };
    setLocal((prev) => prev.map((c) =>
      c.id === campaignId
        ? { ...c, start_at: new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString(), content: { ...c.content, daypart: dp } }
        : c,
    ));
    if (!campaignId.startsWith('local-')) {
      void camp.update(campaignId, { start_at: start.toISOString() });
    }
  }

  return (
    <div className={`rg-regie${standalone ? ' rg-regie--page' : ''}`}>
      <header className="rg-header">
        <div className="rg-emblem">A</div>
        <div>
          <h2>Régie IA · calendrier de diffusion</h2>
          <p>Déposez un média, parlez à l'IA — elle planifie. {camp.campaigns.length + local.length} campagne(s) au planning.</p>
        </div>
      </header>

      <div className="rg-grid2">
        <aside className="rg-side">
          <AIPromptBar advertisers={advertiserNames} onSubmit={setDraft} />
          {draft && (
            <CampaignDraftCard
              draft={draft}
              busy={busy}
              onConfirm={confirm}
              onCancel={() => setDraft(null)}
            />
          )}
          {toast && (
            <div className="rg-toast"><CheckCircle2 size={15} /> {toast}</div>
          )}
          {!draft && !toast && (
            <div className="rg-hint">
              <CalendarClock size={15} />
              <span>Astuce : « Diffuse cette bannière pour Orange du 1ᵉʳ au 15, de 12h à 14h. »</span>
            </div>
          )}
        </aside>

        <main className="rg-main">
          <CampaignCalendar events={events} onReschedule={reschedule} />
        </main>
      </div>
    </div>
  );
}
