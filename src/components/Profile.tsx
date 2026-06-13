import { X, LogOut, Crown, Star, Shield } from 'lucide-react';
import type { AuthUser } from '../hooks/useAuth.ts';

interface ProfileProps {
  user: AuthUser;
  favoritesCount: number;
  isPremium: boolean;
  daysLeft: number;
  onClose: () => void;
  onLogout: () => void;
  onOpenAdmin?: () => void;
}

export function Profile({
  user, favoritesCount, isPremium, daysLeft, onClose, onLogout, onOpenAdmin,
}: ProfileProps): JSX.Element {
  const initial = (user.username ?? user.name ?? '?').charAt(0).toUpperCase();

  return (
    <div className="profile-overlay" role="dialog" aria-label="Profil utilisateur">
      <div className="profile-card">
        <button className="profile-close" onClick={onClose} aria-label="Fermer">
          <X size={18} />
        </button>

        <div className="profile-avatar" aria-hidden="true">{initial}</div>
        <h2 className="profile-name">{user.username ?? user.name}</h2>
        <p className="profile-email">{user.email}</p>

        {isPremium ? (
          <span className="profile-badge profile-badge--premium"><Crown size={12} /> Premium</span>
        ) : (
          <span className="profile-badge">Essai · {daysLeft} j restants</span>
        )}

        <div className="profile-rows">
          <div className="profile-row">
            <span className="profile-row-label"><Star size={13} /> Favoris</span>
            <span className="profile-row-value">{favoritesCount}</span>
          </div>
          <div className="profile-row">
            <span className="profile-row-label"><Shield size={13} /> Statut du compte</span>
            <span className="profile-row-value">{isPremium ? 'Premium actif' : 'Essai gratuit'}</span>
          </div>
          {user.role === 'admin' && (
            <div className="profile-row">
              <span className="profile-row-label"><Shield size={13} /> Rôle</span>
              <span className="profile-row-value">Administrateur</span>
            </div>
          )}
        </div>

        {user.role === 'admin' && onOpenAdmin && (
          <button className="profile-admin-btn" onClick={onOpenAdmin}>
            <Shield size={14} /> Tableau de bord admin
          </button>
        )}

        <button className="profile-logout" onClick={onLogout}>
          <LogOut size={14} /> Se déconnecter
        </button>
      </div>
    </div>
  );
}
