import './Landing.css';
import { useState } from 'react';
import { Play, Tv, Globe, Star, Zap, User, Mail, Lock } from 'lucide-react';
import { AlphaLogoAnimated } from './components/AlphaLogoAnimated.tsx';
import { CinematicBg } from './components/CinematicBg.tsx';

type Mode = 'signin' | 'signup';

interface LandingProps {
  onSignUp: (username: string, email: string, password: string, ageRange?: string) => Promise<{ error?: string }>;
  onSignIn: (email: string, password: string) => Promise<{ error?: string }>;
  onSocial: (provider: 'google' | 'facebook') => Promise<{ error?: string }>;
  onDemo: () => void;
}

export function Landing({ onSignUp, onSignIn, onSocial, onDemo }: LandingProps): JSX.Element {
  const [mode, setMode] = useState<Mode>('signup');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [ageRange, setAgeRange] = useState('');

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
      ? await onSignUp(username.trim(), email.trim(), password, ageRange || undefined)
      : await onSignIn(email.trim(), password);
    setLoading(false);

    if (res.error) {
      setError(translateError(res.error));
    } else if (mode === 'signup') {
      setNotice('Compte créé ! Vous pouvez vous connecter.');
      setMode('signin');
    }
  }

  async function handleSocial(p: 'google' | 'facebook'): Promise<void> {
    setError(''); setNotice(''); setLoading(true);
    const res = await onSocial(p);
    if (res.error) { setError(translateError(res.error)); setLoading(false); }
    // succès → redirection OAuth (la page navigue vers le fournisseur)
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
          <AlphaLogoAnimated size={72} />
          <div className="landing-logo-text">
            AMBITY.A IPTV PLAYER
            <span>by A.Onoseke House Investment RDC</span>
          </div>
        </div>

        <p className="landing-tagline">
          <strong>1700+ chaînes</strong> dont un noyau <strong>francophone & Afrique</strong>
          {' '}vérifié — Congo, Côte d'Ivoire, Cameroun, Sénégal, France 24, TV5Monde…
          {' '}depuis votre navigateur ou votre <strong>Smart TV VIDAA</strong>.
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

          <h1 className="login-title">{mode === 'signup' ? 'Créez votre compte' : 'Bon retour'}</h1>
          <p className="login-sub">
            {mode === 'signup'
              ? 'Vos identifiants, vos favoris, votre profil.'
              : 'Connectez-vous pour retrouver votre profil.'}
          </p>

          {notice && <div className="auth-notice">{notice}</div>}
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-social">
            <button type="button" className="btn-social" onClick={() => void handleSocial('google')} disabled={loading}>
              <GoogleIcon /> Continuer avec Google
            </button>
            <button type="button" className="btn-social" onClick={() => void handleSocial('facebook')} disabled={loading}>
              <FacebookIcon /> Continuer avec Facebook
            </button>
          </div>

          <div className="auth-divider"><span>ou avec un email</span></div>

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

            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label" htmlFor="age">
                  Tranche d'âge <span className="form-optional">(optionnel)</span>
                </label>
                <select
                  id="age"
                  className="form-input form-select"
                  value={ageRange}
                  onChange={(e) => setAgeRange(e.target.value)}
                >
                  <option value="">Préférer ne pas dire</option>
                  <option value="18-24">18–24 ans</option>
                  <option value="25-34">25–34 ans</option>
                  <option value="35-44">35–44 ans</option>
                  <option value="45-54">45–54 ans</option>
                  <option value="55+">55 ans et +</option>
                </select>
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
            En vous connectant, vous acceptez nos{' '}
            <a href="/terms.html" target="_blank" rel="noopener noreferrer">Conditions d'utilisation</a> et notre{' '}
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Politique de confidentialité</a>.<br />
            Contenu légal · sources iptv-org · 100% gratuit
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
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) return 'Connexion sociale pas encore activée côté serveur.';
  if (m.includes('password')) return 'Mot de passe trop faible (6 caractères min).';
  return msg;
}

function GoogleIcon(): JSX.Element {
  return (
    <svg className="btn-social-ic" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.64v3.02h3.88c2.27-2.09 3.54-5.17 3.54-8.9z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.02c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.11A11.99 11.99 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.6H1.29A11.99 11.99 0 0 0 0 12c0 1.94.47 3.77 1.29 5.4l3.98-3.11z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.6l3.98 3.11C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

function FacebookIcon(): JSX.Element {
  return (
    <svg className="btn-social-ic" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#1877F2" d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08V12h3.05V9.41c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.33l-.53 3.47h-2.8v8.38C19.61 22.95 24 17.99 24 12z" />
    </svg>
  );
}
