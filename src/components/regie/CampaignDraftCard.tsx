/**
 * Carte de validation : récapitulatif élégant du brouillon parsé par l'IA,
 * avec actions [Annuler] / [Valider & lancer].
 *
 * @component CampaignDraftCard
 */
import type { JSX } from 'react';
import { Building2, Film, Image as ImageIcon, Type, CalendarRange, Clock, Flag, Megaphone } from 'lucide-react';
import type { CampaignDraft } from '../../utils/parseCampaignPrompt.ts';

interface CampaignDraftCardProps {
  draft: CampaignDraft;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function fmtCap(n: number): string {
  return n.toLocaleString('fr-FR');
}

export function CampaignDraftCard({ draft, busy, onConfirm, onCancel }: CampaignDraftCardProps): JSX.Element {
  const FormatIcon = draft.format === 'video' ? Film : draft.format === 'image' ? ImageIcon : Type;
  const formatLabel = draft.format === 'video' ? 'Vidéo pré-roll' : draft.format === 'image' ? 'Image / bannière' : 'Texte défilant';

  const rows = [
    { icon: <Building2 size={14} />, label: 'Client', value: draft.advertiserName },
    { icon: <FormatIcon size={14} />, label: 'Format', value: formatLabel },
    { icon: <CalendarRange size={14} />, label: 'Période', value: `${shortDate(draft.startDate)} → ${shortDate(draft.endDate)}` },
    ...(draft.daypart
      ? [{ icon: <Clock size={14} />, label: 'Plage horaire', value: `${draft.daypart.startHour} h – ${draft.daypart.endHour} h` }]
      : []),
    ...(draft.impressionCap
      ? [{ icon: <Flag size={14} />, label: 'Arrêt auto', value: `${fmtCap(draft.impressionCap)} vues` }]
      : []),
    { icon: <Megaphone size={14} />, label: 'Diffusion', value: draft.type === 'banner' ? 'Bannière' : draft.type === 'both' ? 'Pré-roll + bannière' : 'Pré-roll' },
  ];

  const conf = Math.round(draft.confidence * 100);

  return (
    <div className="rg-draftcard" role="dialog" aria-label="Validation de la campagne">
      <div className="rg-draftcard-head">
        <span className="rg-draftcard-title">L'IA a compris votre consigne</span>
        <span className={`rg-conf${conf >= 80 ? ' hi' : conf >= 60 ? ' mid' : ' lo'}`}>{conf}% sûr</span>
      </div>
      <div className="rg-draftcard-rows">
        {rows.map((r, i) => (
          <div className="rg-draftcard-row" key={i}>
            <span className="rg-dr-ico">{r.icon}</span>
            <span className="rg-dr-label">{r.label}</span>
            <span className="rg-dr-value">{r.value}</span>
          </div>
        ))}
      </div>
      <div className="rg-draftcard-actions">
        <button className="rg-btn rg-btn--ghost" onClick={onCancel} disabled={busy} type="button">Annuler</button>
        <button className="rg-btn rg-btn--go" onClick={onConfirm} disabled={busy} type="button">
          {busy ? <><span className="rg-spin" /> lancement…</> : 'Valider & lancer'}
        </button>
      </div>
    </div>
  );
}
