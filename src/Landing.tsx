import './Landing.css';
import { useState } from 'react';
import { Play, Tv, Globe, Star, Zap, User, Mail, Lock } from 'lucide-react';
import { AlphaLogo } from './components/AlphaLogo.tsx';
import { CinematicBg } from './components/CinematicBg.tsx';

type Mode = 'signin' | 'signup';

interface LandingProps {
  onSignUp: (username: string, email: string, password: string) => Promise<{ error?: string }>;
  onSignIn: (email: string, password: string) => Promise<{ error?: string }>;
  onDemo: () => void;
}

export function Landing({ onSignUp, onSignIn, onDemo }: LandingProps): JSX.Element {
  const [mode, setMode] = useState<Mode>('signup');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!email.includes('@')) { setError('Adresse email invalide.'); return; }
    if (password.length < 6) { setError('Mot de passe : 6 caractères minimum.'); return; }
    if (mode === 'signup' && username.trim().length < 3) {
      setError("Nom d'utilisateur : 3 caractères minimum."); return;
    }

    setLoading(true);
    const res = mode === 'signup'
      ? await onSignUp(username.trim(), email.trim(), password)
      : await onSignIn(email.trim(), password);
    setLoading(false);

    if (res.error) {
      setError(translateError(res.error));
    } else if (mode === 'signup') {
      // Selon la config Supabase, une confirmation email peut être requise
      setNotice('Compte créé ! Vous pouvez vous connecter.');
      setMode('signin');
    }
    // en cas de succès connexion, le listener de session bascule l'app
  }

  return (
    <div className="landing">
      <CinematicBg />
      <div className="landing-bg" aria-hidden="true" />

      {/* ── LEFT — Branding ── */}
      <section className="landing-left">
        <div className="landing-badge">
          <span className="landing-badge-dot" aria-hidden="true" />
          Streaming gratuit · 100% légal
        </div>

        <div className="landing-logo">
          <AlphaLogo size={72} />
          <div className="landing-logo-text">
            IPTV Player
            <span>by Aonoseke House Investment RDC</span>
          </div>
        </div>

        <p className="landing-tagline">
          <strong>1700+ chaînes</strong> dont un noyau <strong>francophone & Afrique</strong>
          vérifié — Congo, Côte d'Ivoire, Cameroun, Sénégal, France 24, TV5Monde…
          depuis votre navigateur ou votre <strong>Smart TV VIDAA</strong>.
        </p>

        <div className="landing-stats">
          <div className="stat-card">
            <div className="stat-number">1700+</div>
            <div className="stat-label">Chaînes en direct</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">🌍</div>
            <div className="stat-label">Noyau Afrique vérifié</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">100%</div>
            <div className="stat-label">Gratuit · sans abonnement</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">HD</div>
            <div className="stat-label">Qualité adaptative</div>
          </div>
        </div>

        <div className="landing-features">
          {[
            { icon: <Tv size={11} />, text: 'Compatible VIDAA (Hisense), Tizen, WebOS, Android TV' },
            { icon: <Globe size={11} />, text: 'Navigation par pays · catégorie · recherche instantanée' },
            { icon: <Star size={11} />, text: 'Favoris synchronisés sur votre compte' },
            { icon: <Zap size={11} />, text: 'Sources vérifiées · chaînes mortes masquées auto' },
          ].map((f, i) => (
            <div key={i} className="feature-item">
              <span className="feature-check">{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── RIGHT — Auth ── */}
      <section className="landing-right">
        <div className="login-card">
          {/* Toggle */}
          <div className="auth-toggle" role="tablist">
            <button
              role="tab"
              className={`auth-toggle-btn${mode === 'signup' ? ' active' : ''}`}
              onClick={() => { setMode('signup'); setError(''); setNotice(''); }}
            >
              Créer un compte
            </button>
            <button
              role="tab"
              className={`auth-toggle-btn${mode === 'signin' ? ' active' : ''}`}
              onClick={() => { setMode('signin'); setError(''); setNotice(''); }}
            >
              Se connecter
            </button>
          </div>

          <h1 className="login-title">
            {mode === 'signup' ? 'Créez votre compte' : 'Bon retour'}
          </h1>
          <p className="login-sub">
            {mode === 'signup'
              ? 'Vos identifiants, vos favoris, votre profil.'
              : 'Connectez-vous pour retrouver votre profil.'}
          </p>

          {notice && <div className="auth-notice">{notice}</div>}
          {error && <div className="auth-error">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label" htmlFor="username">Nom d'utilisateur</label>
                <div className="input-wrap">
                  <User size={14} className="input-icon" aria-hidden="true" />
                  <input
                    id="username"
                    type="text"
                    className="form-input"
                    placeholder="ex: jean_kinshasa"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <div className="input-wrap">
                <Mail size={14} className="input-icon" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Mot de passe</label>
              <div className="input-wrap">
                <Lock size={14} className="input-icon" aria-hidden="true" />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                <button type="button" className="pass-toggle" onClick={() => setShowPass((s) => !s)}>
                  {showPass ? 'CACHER' : 'VOIR'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading
                ? 'Veuillez patienter…'
                : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
            </button>
          </form>

          <button className="btn-demo" onClick={onDemo} disabled={loading}>
            <Play size={14} fill="currentColor" />
            Aperçu démo — sans compte
          </button>

          <p className="login-terms">
            En continuant, vous acceptez nos{' '}
            <a href="#">Conditions d'utilisation</a> et notre{' '}
            <a href="#">Politique de confidentialité</a>.
          </p>
        </div>
      </section>
    </div>
  );
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered')) return 'Cet email a déjà un compte. Connectez-vous.';
  if (m.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (m.includes('email not confirmed')) return 'Confirmez votre email avant de vous connecter.';
  if (m.includes('duplicate key') || m.includes('username')) return "Ce nom d'utilisateur est déjà pris.";
  if (m.includes('password')) return 'Mot de passe trop faible (6 caractères min).';
  return msg;
}
