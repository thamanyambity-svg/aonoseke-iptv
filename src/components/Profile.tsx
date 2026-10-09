import { useState } from 'react';
import { X, LogOut, Star, Shield, Megaphone, Trash2 } from 'lucide-react';
import type { AuthUser } from '../hooks/useAuth.ts';
import type { JSX } from 'react';

interface ProfileProps {
  user: AuthUser;
  favoritesCount: number;
  onClose: () => void;
  onLogout: () => void;
  onOpenAdmin?: () => void;
  onOpenAdMgmt?: () => void;
  /** Absent pour le mode démo et les administrateurs : le bouton « Supprimer mon compte » n'est alors pas affiché. */
  onDeleteAccount?: () => Promise<{ error?: string }>;
}

export default function Profile({
  user, favoritesCount, onClose, onLogout, onOpenAdmin, onOpenAdMgmt, onDeleteAccount,
}: ProfileProps): JSX.Element {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

        {onDeleteAccount && !confirming && (
          <button className="profile-delete-link" onClick={() => setConfirming(true)}>
            <Trash2 size={13} /> Supprimer mon compte
          </button>
        )}

        {onDeleteAccount && confirming && (
          <div className="profile-delete-box" role="alertdialog" aria-label="Confirmer la suppression du compte">
            <p className="profile-delete-warn">
              Cette action est <strong>définitive</strong> : votre compte, vos favoris et votre historique d'activité
              seront supprimés. Les statistiques d'audience sont conservées sans aucun lien avec vous.
            </p>
            <label className="profile-delete-label" htmlFor="delete-confirm">
              Tapez <strong>SUPPRIMER</strong> pour confirmer
            </label>
            <input
              id="delete-confirm"
              className="profile-delete-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              disabled={deleting}
            />
            {deleteError && <p className="profile-delete-error" role="alert">{deleteError}</p>}
            <div className="profile-delete-actions">
              <button
                className="profile-delete-cancel"
                disabled={deleting}
                onClick={() => { setConfirming(false); setConfirmText(''); setDeleteError(''); }}
              >
                Annuler
              </button>
              <button
                className="profile-delete-confirm"
                disabled={deleting || confirmText.trim().toUpperCase() !== 'SUPPRIMER'}
                onClick={() => {
                  setDeleting(true);
                  setDeleteError('');
                  void onDeleteAccount().then((res) => {
                    setDeleting(false);
                    if (res.error) setDeleteError(res.error);
                  });
                }}
              >
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
