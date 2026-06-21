/**
 * ActionCard — carte de recommandation d'un agent IA.
 *
 * Affiche : l'agent émetteur, la recommandation, le POURQUOI (explication), les
 * paramètres clés, la confiance, et les boutons stricts [REJETER] / [VALIDER &
 * EXÉCUTER]. Aucune action n'est exécutée sans le clic VALIDER (la mutation
 * réelle se fait côté serveur dans admin_resolve_agent_proposal).
 *
 * @component ActionCard
 */
import { useState } from 'react';
import type { JSX } from 'react';
import { TrendingUp, Radar, CloudRain, ShieldAlert, Check, X, Sparkles } from 'lucide-react';
import type { AgentProposal, AgentKind } from '../../hooks/useAgentProposals.ts';

const AGENTS: Record<AgentKind, { label: string; Icon: typeof TrendingUp; color: string }> = {
  yield:    { label: 'Yield Management', Icon: TrendingUp,  color: '#c9a84c' },
  swarm:    { label: 'Swarm Delivery',   Icon: Radar,       color: '#1D9E75' },
  context:  { label: 'Contextualisation', Icon: CloudRain,  color: '#378ADD' },
  sentinel: { label: 'Sentinel',         Icon: ShieldAlert, color: '#E24B4A' },
};

interface ActionCardProps {
  proposal: AgentProposal;
  onResolve: (id: string, approve: boolean) => Promise<{ error?: string }>;
}

export function ActionCard({ proposal, onResolve }: ActionCardProps): JSX.Element {
  const [busy, setBusy] = useState<null | 'approve' | 'reject'>(null);
  const [err, setErr] = useState<string | null>(null);

  const meta = AGENTS[proposal.agent] ?? AGENTS.yield;
  const conf = Math.round(proposal.confidence * 100);
  const chips = Object.entries(proposal.payload ?? {}).slice(0, 4);

  async function act(approve: boolean): Promise<void> {
    setBusy(approve ? 'approve' : 'reject');
    setErr(null);
    const r = await onResolve(proposal.id, approve);
    if (r.error) { setErr(r.error); setBusy(null); }
  }

  return (
    <div className="ac-card" style={{ borderLeftColor: meta.color }}>
      <div className="ac-head">
        <span className="ac-agent" style={{ color: meta.color }}>
          <meta.Icon size={14} aria-hidden="true" /> {meta.label}
        </span>
        <span className={`ac-conf${conf >= 80 ? ' hi' : conf >= 60 ? ' mid' : ''}`}>
          <Sparkles size={11} aria-hidden="true" /> {conf}% sûr
        </span>
      </div>

      <h4 className="ac-title">{proposal.title}</h4>
      <p className="ac-why">{proposal.summary}</p>

      {chips.length > 0 && (
        <div className="ac-chips">
          {chips.map(([k, v]) => (
            <span key={k} className="ac-chip"><b>{k}</b> {String(v)}</span>
          ))}
        </div>
      )}

      {err && <p className="ac-err">{err}</p>}

      <div className="ac-actions">
        <button className="ac-btn ac-btn--reject" disabled={!!busy} onClick={() => void act(false)} type="button">
          {busy === 'reject' ? <span className="ac-spin" /> : <X size={14} />} Rejeter
        </button>
        <button className="ac-btn ac-btn--go" disabled={!!busy} onClick={() => void act(true)} type="button">
          {busy === 'approve' ? <span className="ac-spin" /> : <Check size={14} />} Valider &amp; exécuter
        </button>
      </div>
    </div>
  );
}
