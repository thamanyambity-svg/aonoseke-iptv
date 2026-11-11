import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, JSX } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import type { Channel } from '../types';
import { buildHomeRows, pickFeatured } from '../utils/homeRows.ts';
import { displayName, monogram } from '../utils/displayName.ts';
import { keyToDir, moveInGrid } from '../utils/spatialNav.ts';
import { countryFlag } from './Sidebar.tsx';
import './BrowseHome.css';

interface BrowseHomeProps {
  channels: Channel[];
  isLoading: boolean;
  onSelect: (channel: Channel) => void;
}

/** Teinte stable par chaîne (sert de fond quand il n'y a pas de logo). */
function hue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}
const tintStyle = (name: string): CSSProperties => ({ '--bh-hue': hue(name) }) as CSSProperties;

function Art({ channel, big = false }: { channel: Channel; big?: boolean }): JSX.Element {
  const [broken, setBroken] = useState(false);
  const hasLogo = Boolean(channel.logo) && !broken;
  return (
    <span className={`bh-art${big ? ' bh-art-big' : ''}`} style={tintStyle(channel.name)}>
      {hasLogo && <img className="bh-art-blur" src={channel.logo} alt="" aria-hidden="true" loading="lazy" />}
      {hasLogo ? (
        <img className="bh-art-logo" src={channel.logo} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <span className="bh-art-mono" aria-hidden="true">{monogram(channel.name)}</span>
      )}
    </span>
  );
}

function Poster({ channel, onSelect }: { channel: Channel; onSelect: (c: Channel) => void }): JSX.Element {
  const { title, quality } = displayName(channel.name);
  return (
    <button type="button" className="bh-card" onClick={() => onSelect(channel)} aria-label={`Regarder ${title}`}>
      <span className="bh-card-frame">
        <Art channel={channel} />
        <span className="bh-pill-live"><span className="bh-dot" aria-hidden="true" />Direct</span>
        {quality && <span className="bh-pill-q">{quality}</span>}
        <span className="bh-card-play" aria-hidden="true"><Play size={22} fill="currentColor" /></span>
      </span>
      <span className="bh-card-name">{title}</span>
      <span className="bh-card-sub">{countryFlag(channel.country)} {channel.group}</span>
    </button>
  );
}

function Row({ id, title, channels, onSelect }: { id: string; title: string; channels: Channel[]; onSelect: (c: Channel) => void }): JSX.Element {
  const scroller = useRef<HTMLDivElement>(null);
  const scroll = (dir: -1 | 1): void => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };
  return (
    <section className="bh-row" id={`bh-row-${id}`} aria-label={title}>
      <h3 className="bh-row-title">{title}<span className="bh-row-count">{channels.length}</span></h3>
      <div className="bh-row-wrap">
        <button type="button" className="bh-arrow bh-arrow-left" onClick={() => scroll(-1)} aria-label={`${title} : précédent`}>
          <ChevronLeft size={26} />
        </button>
        <div className="bh-scroller" ref={scroller}>
          {channels.map((ch) => <Poster key={ch.url} channel={ch} onSelect={onSelect} />)}
        </div>
        <button type="button" className="bh-arrow bh-arrow-right" onClick={() => scroll(1)} aria-label={`${title} : suivant`}>
          <ChevronRight size={26} />
        </button>
      </div>
    </section>
  );
}

/** Accueil façon catalogue, aux couleurs et aux polices d'Aonoseke : barre de catégories, bannière, rangées. */
export function BrowseHome({ channels, isLoading, onSelect }: BrowseHomeProps): JSX.Element {
  const rows = useMemo(() => buildHomeRows(channels), [channels]);
  const featured = useMemo(() => pickFeatured(channels), [channels]);
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string>('top');

  // Éléments focalisables par ligne : [catégories], [bannière], puis une ligne par rangée.
  const grid = (): HTMLElement[][] => {
    const el = root.current;
    if (!el) return [];
    const q = (sel: string, ctx: ParentNode = el): HTMLElement[] => Array.from(ctx.querySelectorAll<HTMLElement>(sel));
    return [
      q('.bh-chip'),
      q('.bh-hero-actions button'),
      ...q('.bh-scroller').map((s) => q('.bh-card', s)),
    ];
  };

  // Télécommande : en mode TV, le focus démarre sur « Regarder ».
  useEffect(() => {
    if (!document.documentElement.classList.contains('tv-mode')) return;
    root.current?.querySelector<HTMLElement>('.bh-play')?.focus({ preventScroll: true });
  }, [featured]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const dir = keyToDir(e.key);
    if (!dir) return;
    const lines = grid();
    const activeEl = document.activeElement as HTMLElement | null;
    const row = lines.findIndex((l) => activeEl && l.includes(activeEl));
    if (row < 0) {
      lines[1]?.[0]?.focus();
      e.preventDefault();
      return;
    }
    const col = Math.max(0, lines[row]?.indexOf(activeEl as HTMLElement) ?? 0);
    const next = moveInGrid(lines.map((l) => l.length), { row, col }, dir);
    const target = lines[next.row]?.[next.col];
    e.preventDefault(); // au bord : ne pas laisser la page défiler à côté du focus
    if (target && target !== activeEl) {
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    }
  };

  const goTo = (id: string): void => {
    setActive(id);
    const host = root.current;
    if (!host) return;
    if (id === 'top') { host.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const target = host.querySelector<HTMLElement>(`#bh-row-${id}`);
    if (target) host.scrollTo({ top: target.offsetTop - 76, behavior: 'smooth' });
  };

  const hero = featured ? displayName(featured.name) : null;

  return (
    <div className="browse-home" ref={root} onKeyDown={onKeyDown}>
      <nav className="bh-topbar" aria-label="Catégories">
        <div className="bh-brand" aria-hidden="true"><span className="bh-brand-a">A</span>AONOSEKE</div>
        <div className="bh-chips">
          <button type="button" className={`bh-chip${active === 'top' ? ' is-active' : ''}`} onClick={() => goTo('top')}>À la une</button>
          {rows.map((r) => (
            <button key={r.id} type="button" className={`bh-chip${active === r.id ? ' is-active' : ''}`} onClick={() => goTo(r.id)}>
              {r.title}
            </button>
          ))}
        </div>
      </nav>

      {featured && hero ? (
        <header className="bh-hero" style={tintStyle(featured.name)}>
          <div className="bh-hero-glow" aria-hidden="true" />
          <span className="bh-hero-mark" aria-hidden="true">A</span>
          <div className="bh-hero-body">
            <div className="bh-hero-meta">
              <span className="bh-pill-live bh-pill-live-lg"><span className="bh-dot" aria-hidden="true" />En direct</span>
              <span>{countryFlag(featured.country)} {featured.group}</span>
              {hero.quality && <span className="bh-meta-q">{hero.quality}</span>}
            </div>
            <h2 className="bh-hero-title">{hero.title}</h2>
            <div className="bh-hero-actions">
              <button type="button" className="bh-play" onClick={() => onSelect(featured)}>
                <Play size={20} fill="currentColor" aria-hidden="true" /> Regarder
              </button>
              {rows[0] && (
                <button type="button" className="bh-ghost" onClick={() => goTo(rows[0]?.id ?? 'top')}>
                  Parcourir {rows[0].title}
                </button>
              )}
            </div>
          </div>
          <div className="bh-hero-art" aria-hidden="true"><Art channel={featured} big /></div>
        </header>
      ) : (
        <div className="bh-empty">{isLoading ? 'Chargement du catalogue…' : 'Aucune chaîne disponible pour le moment.'}</div>
      )}

      <div className="bh-rows">
        {rows.map((r) => <Row key={r.id} id={r.id} title={r.title} channels={r.channels} onSelect={onSelect} />)}
      </div>
    </div>
  );
}
