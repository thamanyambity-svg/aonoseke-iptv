/**
 * Barre de commande IA + zone de dépôt média.
 *
 * L'utilisateur glisse une image / vidéo (ou tape un texte), écrit une consigne
 * en langage naturel, et envoie. Le parsing (simulé) produit un `CampaignDraft`
 * remonté au parent via `onSubmit`.
 *
 * @component AIPromptBar
 */
import { useRef, useState } from 'react';
import type { JSX, DragEvent } from 'react';
import { UploadCloud, Sparkles, ArrowUp, Film, Image as ImageIcon, Type, X } from 'lucide-react';
import {
  parseCampaignPrompt,
  type CampaignDraft,
  type DraftMedia,
  type MediaKind,
} from '../../utils/parseCampaignPrompt.ts';

interface AIPromptBarProps {
  advertisers: string[];
  onSubmit: (draft: CampaignDraft) => void;
}

const SAMPLE = "Diffuse cette vidéo pour Vodacom tous les jours entre 18h et 22h, de lundi prochain jusqu'à la fin du mois. Arrête si on atteint 50 000 vues.";

function kindOf(file: File): MediaKind {
  if (file.type.startsWith('video')) return 'video';
  if (file.type.startsWith('image')) return 'image';
  return 'text';
}

export function AIPromptBar({ advertisers, onSubmit }: AIPromptBarProps): JSX.Element {
  const [media, setMedia] = useState<DraftMedia | null>(null);
  const [text, setText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [thinking, setThinking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function takeFile(file: File | undefined): void {
    if (!file) return;
    const kind = kindOf(file);
    const url = kind === 'text' ? undefined : URL.createObjectURL(file);
    setMedia({ kind, name: file.name, url });
  }

  function onDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setDragOver(false);
    takeFile(e.dataTransfer.files?.[0]);
  }

  function send(): void {
    const prompt = text.trim();
    if (!prompt) return;
    setThinking(true);
    // Délai cosmétique pour simuler le "raisonnement" de l'IA.
    window.setTimeout(() => {
      const draft = parseCampaignPrompt(prompt, media ?? undefined, advertisers);
      setThinking(false);
      onSubmit(draft);
    }, 650);
  }

  const MediaIcon = media?.kind === 'video' ? Film : media?.kind === 'image' ? ImageIcon : Type;

  return (
    <div className="rg-promptbar">
      {/* Zone de dépôt média */}
      <div
        className={`rg-drop${dragOver ? ' is-over' : ''}${media ? ' has-media' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !media && fileRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Déposer un média"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={(e) => { takeFile(e.currentTarget.files?.[0] ?? undefined); e.currentTarget.value = ''; }}
        />
        {media ? (
          <div className="rg-media">
            <div className="rg-media-preview">
              {media.kind === 'image' && media.url
                ? <img src={media.url} alt="" />
                : media.kind === 'video' && media.url
                  ? <video src={media.url} muted />
                  : <MediaIcon size={22} />}
              <span className="rg-media-badge"><MediaIcon size={12} /> {media.kind}</span>
            </div>
            <div className="rg-media-meta">
              <span className="rg-media-name">{media.name}</span>
              <button
                className="rg-media-rm"
                onClick={(e) => { e.stopPropagation(); if (media.url) URL.revokeObjectURL(media.url); setMedia(null); }}
                aria-label="Retirer le média"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        ) : (
          <div className="rg-drop-empty">
            <UploadCloud size={26} />
            <p>Glissez une image ou une vidéo</p>
            <span>ou cliquez pour parcourir · texte défilant aussi accepté</span>
          </div>
        )}
      </div>

      {/* Composer IA */}
      <div className="rg-composer">
        <div className="rg-composer-label"><Sparkles size={13} /> Assistant régie</div>
        <textarea
          className="rg-composer-input"
          rows={3}
          placeholder="Décrivez la diffusion en français… ex. « Diffuse cette vidéo pour Vodacom entre 18h et 22h, de lundi à la fin du mois, stop à 50 000 vues. »"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
        />
        <div className="rg-composer-foot">
          <button className="rg-chip-btn" onClick={() => setText(SAMPLE)} type="button">
            Exemple
          </button>
          <button
            className="rg-send"
            onClick={send}
            disabled={!text.trim() || thinking}
            type="button"
          >
            {thinking ? <><span className="rg-spin" /> analyse…</> : <><ArrowUp size={15} /> Envoyer à l'IA</>}
          </button>
        </div>
      </div>
    </div>
  );
}
