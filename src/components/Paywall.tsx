import { Lock, Check, Smartphone, CreditCard } from 'lucide-react';

interface PaywallProps {
  daysUsed: number;
  onSubscribe: () => void;
}

const PERKS = [
  'Annuaire vérifié — sources testées toutes les 5 min',
  'Alertes quand une source change d’adresse',
  'Favoris synchronisés sur tous vos appareils',
  'Navigation sans publicité',
];

export function Paywall({ daysUsed, onSubscribe }: PaywallProps): JSX.Element {
  return (
    <div className="paywall">
      <div className="paywall-card">
        <div className="paywall-icon" aria-hidden="true">
          <Lock size={26} />
        </div>

        <span className="paywall-kicker">Essai gratuit terminé</span>
        <h2 className="paywall-title">Passez à Premium</h2>
        <p className="paywall-sub">
          Vous avez profité de {daysUsed} jours d’accès complet.
          Débloquez l’annuaire vérifié et l’expérience sans pub.
        </p>

        <ul className="paywall-perks">
          {PERKS.map((p) => (
            <li key={p}>
              <span className="paywall-check"><Check size={12} /></span>
              {p}
            </li>
          ))}
        </ul>

        <div className="paywall-price">
          <span className="paywall-amount">2 500 FC</span>
          <span className="paywall-period">/ mois</span>
        </div>

        <button className="paywall-cta" onClick={onSubscribe}>
          S’abonner maintenant
        </button>

        <div className="paywall-methods">
          <span><Smartphone size={13} /> M-Pesa · Orange · Airtel Money</span>
          <span><CreditCard size={13} /> Carte bancaire</span>
        </div>

        <p className="paywall-note">
          Le mode Direct (chaînes en clair) reste gratuit.
        </p>
      </div>
    </div>
  );
}
