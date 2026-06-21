/**
 * AgentConsole — poste de commandement des 4 agents IA.
 *
 * Liste les propositions en attente (Yield, Swarm, Contextualisation, Sentinel)
 * sous forme d'ActionCards. L'admin valide/rejette ; rien ne s'exécute sans clic.
 *
 * @component AgentConsole
 */
import type { JSX } from 'react';
import { Cpu, RefreshCw } from 'lucide-react';
import './agents.css';
import { useAgentProposals } from '../../hooks/useAgentProposals.ts';
import { ActionCard } from './ActionCard.tsx';

export function AgentConsole(): JSX.Element {
  const { proposals, loading, error, reload, resolve } = useAgentProposals();

  return (
    <section className="ac-console">
      <header className="ac-console-head">
        <div className="ac-console-title">
          <Cpu size={16} aria-hidden="true" />
          <span>Console IA · propositions en attente</span>
          <span className="ac-count">{proposals.length}</span>
        </div>
        <button className="ac-refresh" onClick={() => void reload()} aria-label="Actualiser" type="button">
          <RefreshCw size={13} className={loading ? 'ac-spin-icon' : ''} /> Actualiser
        </button>
      </header>

      <p className="ac-console-sub">
        Les agents analysent et proposent. <b>Aucune action n'est exécutée sans ta validation.</b>
      </p>

      {error ? (
        <p className="ac-empty">{error}</p>
      ) : proposals.length === 0 ? (
        <p className="ac-empty">{loading ? 'Chargement…' : 'Aucune proposition en attente. Les agents veillent.'}</p>
      ) : (
        <div className="ac-list">
          {proposals.map((p) => (
            <ActionCard key={p.id} proposal={p} onResolve={resolve} />
          ))}
        </div>
      )}
    </section>
  );
}
