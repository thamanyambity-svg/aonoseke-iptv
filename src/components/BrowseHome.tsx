import { useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { ChevronLeft, ChevronRight, Play, Tv } from 'lucide-react';
import type { Channel } from '../types';
import { buildHomeRows, pickFeatured } from '../utils/homeRows.ts';
import { countryFlag } from './Sidebar.tsx';
import { keyToDir, moveInGrid } from '../utils/spatialNav.ts';
import './BrowseHome.css';

interface BrowseHomeProps {
  channels: Channel[];
  isLoading: boolean;
  onSelect: (channel: Channel) => void;
}

function tint(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 45% 22%)`;
}

function Poster({ channel, onSelect }: { channel: Channel; onSelect: (c: Channel) => void }): JSX.Element {
  const [broken, setBroken] = useState(false);
  return (
    <button
      type="button"
      className="bh-card"
      onClick={() => onSelect(channel)}
      aria-label={`Regarder ${channel.name}`}
      style={{ '--bh-tint': tint(channel.name) } as React.CSSProperties}
    >
      <span className="bh-card-art">
        {channel.logo && !broken ? (
          <img src={channel.logo} alt="" loading="lazy" onError={() => setBroken(true)} />
        ) : (
          <span className="bh-card-initial" aria-hidden="true">{channel.name.slice(0, 2).toUpperCase()}</span>
        )}
        <span className="bh-card-live">
          <span className="bh-card-dot" aria-hidden="true" /> LIVE
        </span>
      </span>
      <span className="bh-card-meta">
        <span className="bh-card-name">{channel.name}</span>
        <span className="bh-card-sub">{countryFlag(channel.country)} {channel.group}</span>
      </span>
    </button>
  );
}

function Row({ title, channels, onSelect }: { title: string; channels: Channel[]; onSelect: (c: Channel) => void }): JSX.Element {
  const scroller = useRef<HTMLDivElement>(null);
  const scroll = (dir: -1 | 1): void => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };
  return (
    <section className="bh-row" aria-label={title}>
      <h3 className="bh-row-title">{title}</h3>
      <div className="bh-row-wrap">
        <button type="button" className="bh-arrow bh-arrow-left" onClick={() => scroll(-1)} aria-label={`${title} : précédent`}>
          <ChevronLeft size={28} />
        </button>
        <div className="bh-scroller" ref={scroller}>
          {channels.map((ch) => <Poster key={ch.url} channel={ch} onSelect={onSelect} />)}
        </div>
        <button type="button" className="bh-arrow bh-arrow-right" onClick={() => scroll(1)} aria-label={`${title} : suivant`}>
          <ChevronRight size={28} />
        </button>
      </div>
    </section>
  );
}

/** Accueil façon catalogue : bannière « à la une » + rangées horizontales par thème. */
export function BrowseHome({ channels, isLoading, onSelect }: BrowseHomeProps): JSX.Element {
  const rows = useMemo(() => buildHomeRows(channels), [channels]);
  const featured = useMemo(() => pickFeatured(channels), [channels]);
  const root = useRef<HTMLDivElement>(null);

  // Éléments focalisables par rangée : [bannière] puis une rangée par thème.
  const grid = (): HTMLElement[][] => {
    const el = root.current;
    if (!el) return [];
    const hero = Array.from(el.querySelectorAll<HTMLElement>('.bh-play'));
    const lines = Array.from(el.querySelectorAll<HTMLElement>('.bh-scroller')).map((s) =>
      Array.from(s.querySelectorAll<HTMLElement>('.bh-card')),
    );
    return [hero, ...lines];
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
    const active = document.activeElement as HTMLElement | null;
    let row = lines.findIndex((l) => active && l.includes(active));
    if (row < 0) {
      // Rien de focalisé : la première flèche pose le focus sur la bannière.
      lines[0]?.[0]?.focus();
      e.preventDefault();
      return;
    }
    const col = Math.max(0, lines[row]?.indexOf(active as HTMLElement) ?? 0);
    const next = moveInGrid(lines.map((l) => l.length), { row, col }, dir);
    row = next.row;
    const target = lines[row]?.[next.col];
    if (target && target !== active) {
      e.preventDefault();
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    } else {
      e.preventDefault(); // au bord : ne pas laisser la page défiler à côté du focus
    }
  };

  return (
    <div className="browse-home" ref={root} onKeyDown={onKeyDown}>
      {featured && (
        <header className="bh-hero" style={{ '--bh-tint': tint(featured.name) } as React.CSSProperties}>
          {featured.logo && <img className="bh-hero-bg" src={featured.logo} alt="" aria-hidden="true" />}
          <div className="bh-hero-shade" aria-hidden="true" />
          <div className="bh-hero-body">
            <div className="bh-hero-brand">AONOSEKE</div>
            <h2 className="bh-hero-title">{featured.name}</h2>
            <p className="bh-hero-sub">{countryFlag(featured.country)} {featured.group} · En direct</p>
            <button type="button" className="bh-play" onClick={() => onSelect(featured)}>
              <Play size={20} fill="currentColor" aria-hidden="true" /> Regarder
            </button>
          </div>
        </header>
      )}

      {!featured && (
        <div className="bh-empty">
          <Tv size={40} aria-hidden="true" />
          <p>{isLoading ? 'Chargement du catalogue…' : 'Aucune chaîne disponible pour le moment.'}</p>
        </div>
      )}

      <div className="bh-rows">
        {rows.map((r) => <Row key={r.id} title={r.title} channels={r.channels} onSelect={onSelect} />)}
      </div>
    </div>
  );
}
