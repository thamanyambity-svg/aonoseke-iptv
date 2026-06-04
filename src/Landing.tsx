import './Landing.css';
import { useState } from 'react';
import { MonitorPlay, Play, Check, Tv, Globe, Star, Zap } from 'lucide-react';
import type { AuthUser } from './hooks/useAuth.ts';

// ── Social SVG icons ──────────────────────────────────────────────────────────

function GoogleIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="social-icon">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="#1877F2" className="social-icon">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function AppleIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="social-icon">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.701z"/>
    </svg>
  );
}

// ── Demo credentials ─────────────────────────────────────────────────────────
const DEMO_EMAIL = 'demo@aonoseke.com';
const DEMO_PASS  = 'demo2024';

// ── Component ────────────────────────────────────────────────────────────────
interface LandingProps {
  onLogin: (user: AuthUser) => void;
}

export function Landing({ onLogin }: LandingProps): JSX.Element {
  const [email, setEmail]       = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASS);
  const [emailErr, setEmailErr] = useState('');
  const [passErr, setPassErr]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  function handleEmailLogin(e: React.FormEvent): void {
    e.preventDefault();
    setEmailErr('');
    setPassErr('');

    let valid = true;
    if (!email.includes('@')) { setEmailErr('Email invalide.'); valid = false; }
    if (password.length < 6) { setPassErr('6 caractères minimum.'); valid = false; }
    if (!valid) return;

    onLogin({ name: 'Utilisateur', email, provider: 'email' });
  }

  function handleDemo(): void {
    onLogin({ name: 'Visiteur Démo', email: DEMO_EMAIL, provider: 'demo' });
  }

  function handleSocial(provider: 'google' | 'facebook' | 'apple'): void {
    const names: Record<string, string> = {
      google: 'Utilisateur Google',
      facebook: 'Utilisateur Facebook',
      apple: 'Utilisateur Apple',
    };
    onLogin({ name: names[provider], email: `${provider}@aonoseke.com`, provider });
  }

  return (
    <div className="landing">
      {/* Animated background */}
      <div className="landing-bg" aria-hidden="true" />

      {/* ── LEFT — Branding + Features ── */}
      <section className="landing-left">
        <div className="landing-badge">
          <span className="landing-badge-dot" aria-hidden="true" />
          Streaming gratuit · 100% légal
        </div>

        <div className="landing-logo">
          <div className="landing-logo-icon" aria-hidden="true">
            <MonitorPlay size={28} color="#0b0d16" />
          </div>
          <div className="landing-logo-text">
            IPTV Player
            <span>by Aonoseke House Investment RDC</span>
          </div>
        </div>

        <p className="landing-tagline">
          Regardez <strong>3 400+ chaînes internationales</strong> gratuitement —
          films, séries, sport, documentaires et bien plus,
          depuis votre navigateur ou votre <strong>Smart TV VIDAA</strong>.
        </p>

        {/* Stats */}
        <div className="landing-stats">
          <div className="stat-card">
            <span className="stat-icon">📡</span>
            <div className="stat-number">3 400+</div>
            <div className="stat-label">Chaînes en direct</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🌍</span>
            <div className="stat-number">80+</div>
            <div className="stat-label">Pays représentés</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📂</span>
            <div className="stat-number">28</div>
            <div className="stat-label">Catégories de contenu</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📺</span>
            <div className="stat-number">4K</div>
            <div className="stat-label">HD · FHD · Ultra HD</div>
          </div>
        </div>

        {/* Features */}
        <div className="landing-features">
          {[
            { icon: <Tv size={11} />, text: 'Compatible VIDAA (Hisense), Tizen, WebOS, Android TV' },
            { icon: <Globe size={11} />, text: 'Navigation par pays · par catégorie · recherche instantanée' },
            { icon: <Star size={11} />, text: 'Liste de favoris persistante · reprenez où vous avez arrêté' },
            { icon: <Zap size={11} />, text: 'PWA installable · fonctionne hors connexion (chaînes en cache)' },
          ].map((f, i) => (
            <div key={i} className="feature-item">
              <span className="feature-check">{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── RIGHT — Login ── */}
      <section className="landing-right">
        <div className="login-card">
          <h1 className="login-title">Accéder au player</h1>
          <p className="login-sub">Connectez-vous pour sauvegarder vos favoris et préférences.</p>

          {/* Social buttons */}
          <div className="social-btns">
            <button className="social-btn google" onClick={() => handleSocial('google')} disabled={loading}>
              <GoogleIcon />
              Continuer avec Google
            </button>
            <button className="social-btn facebook" onClick={() => handleSocial('facebook')} disabled={loading}>
              <FacebookIcon />
              Continuer avec Facebook
            </button>
            <button className="social-btn apple" onClick={() => handleSocial('apple')} disabled={loading}>
              <AppleIcon />
              Continuer avec Apple
            </button>
          </div>

          <div className="login-divider">ou</div>

          {/* Email form */}
          <form className="login-form" onSubmit={handleEmailLogin} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className={`form-input${emailErr ? ' error' : ''}`}
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              {emailErr && <span className="form-error">{emailErr}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className={`form-input${passErr ? ' error' : ''}`}
                  style={{ width: '100%', paddingRight: '40px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', color: 'var(--text-3)', cursor: 'pointer',
                    fontSize: '0.7rem', fontFamily: 'var(--mono)',
                  }}
                >
                  {showPass ? 'CACHER' : 'VOIR'}
                </button>
              </div>
              {passErr && <span className="form-error">{passErr}</span>}
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          {/* Demo access */}
          <button className="btn-demo" onClick={handleDemo} disabled={loading}>
            <Play size={14} fill="currentColor" />
            Accès démo — sans inscription
          </button>

          {/* Demo hint */}
          <div className="demo-hint">
            <strong>Compte démo :</strong><br />
            Email : <strong>{DEMO_EMAIL}</strong><br />
            Mot de passe : <strong>{DEMO_PASS}</strong>
          </div>

          <p className="login-terms">
            En vous connectant, vous acceptez nos{' '}
            <a href="#">Conditions d'utilisation</a> et notre{' '}
            <a href="#">Politique de confidentialité</a>.<br />
            Contenu légal · sources iptv-org · 100% gratuit
          </p>
        </div>
      </section>
    </div>
  );
}
