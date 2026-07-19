import { X, LogOut, Star, Shield, Megaphone } from 'lucide-react';
import type { AuthUser } from '../hooks/useAuth.ts';

interface ProfileProps {
  user: AuthUser;
  favoritesCount: number;
  onClose: () => void;
  onLogout: () => void;
  onOpenAdmin?: () => void;
  onOpenAdMgmt?: () => void;
}

export default function Profile({
  user, favoritesCount, onClose, onLogout, onOpenAdmin, onOpenAdMgmt,
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

        <span className="profile-badge">Compte gratuit</span>

        <div className="profile-rows">
          <div className="profile-row">
            <span className="profile-row-label"><Star size={13} /> Favoris</span>
            <span className="profile-row-value">{favoritesCount}</span>
          </div>
          <div className="profile-row">
            <span className="profile-row-label"><Shield size={13} /> Statut du compte</span>
            <span className="profile-row-value">Accès complet gratuit</span>
          </div>
          {user.role === 'admin' && (
            <div className="profile-row">
              <span className="profile-row-label"><Shield size={13} /> Rôle</span>
              <span className="profile-row-value">Administrateur</span>
            </div>
          )}
        </div>

        {user.role === 'admin' && onOpenAdMgmt && (
          <button className="profile-admin-btn profile-ad-btn" onClick={onOpenAdMgmt}>
            <Megaphone size={14} /> Gestion publicitaire
          </button>
        )}

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
