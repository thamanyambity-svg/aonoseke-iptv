import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AdminDashboard from '../components/AdminDashboard.tsx';
import { useAuthStore } from '../stores/authStore.ts';

export default function AdminPage(): JSX.Element | null {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const handleClose = useCallback(() => {
    navigate('/');
  }, [navigate]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin" style={{ padding: 40, textAlign: 'center' }}>
        <h2>Accès restreint</h2>
        <p>Vous devez être administrateur pour accéder à cette page.</p>
        <button className="admin-btn" onClick={() => navigate('/')} style={{ marginTop: 16 }}>
          <ArrowLeft size={14} /> Retour au player
        </button>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <button
        className="admin-back-btn"
        onClick={handleClose}
        aria-label="Retour au player"
        title="Retour au player"
      >
        <ArrowLeft size={20} />
      </button>
      <AdminDashboard user={user} onClose={handleClose} />
    </div>
  );
}
