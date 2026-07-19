import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { Advertiser } from '../../hooks/useAdvertisers';
import type { Campaign, CampaignType, CampaignContent } from '../../hooks/useCampaigns';

function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

interface CampaignFormProps {
  advertisers: Advertiser[];
  initial?: Partial<Campaign>;
  onSubmit: (data: {
    advertiser_id: string;
    name: string;
    type: CampaignType;
    content: CampaignContent;
    weight: number;
    frequency_cap_per_user: number;
    start_at?: string;
    end_at?: string | null;
    impression_cap?: number | null;
    click_cap?: number | null;
  }) => void;
  onCancel: () => void;
}

export function CampaignForm({ advertisers, initial, onSubmit, onCancel }: CampaignFormProps): JSX.Element {
  const [advertiserId, setAdvertiserId] = useState(initial?.advertiser_id ?? advertisers[0]?.id ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<CampaignType>(initial?.type ?? 'preroll');
  const [title, setTitle] = useState(initial?.content?.title ?? '');
  const [subtitle, setSubtitle] = useState(initial?.content?.subtitle ?? '');
  const [cta, setCta] = useState(initial?.content?.cta ?? '');
  const [url, setUrl] = useState(initial?.content?.url ?? '');
  const [eyebrow, setEyebrow] = useState(initial?.content?.eyebrow ?? '');
  const [legal, setLegal] = useState(initial?.content?.legal ?? '');
  const [variant, setVariant] = useState<'souverain' | 'corridor'>(initial?.content?.variant ?? 'souverain');
  const [image, setImage] = useState(initial?.content?.image ?? '');
  const [video, setVideo] = useState(initial?.content?.video ?? '');
  const [weight, setWeight] = useState(initial?.weight ?? 10);
  const [freqCap, setFreqCap] = useState(initial?.frequency_cap_per_user ?? 3);
  const [startAt, setStartAt] = useState(toLocalInput(initial?.start_at));
  const [endAt, setEndAt] = useState(toLocalInput(initial?.end_at ?? null));
  const [imprCap, setImprCap] = useState(initial?.impression_cap != null ? String(initial.impression_cap) : '');
  const [clickCap, setClickCap] = useState(initial?.click_cap != null ? String(initial.click_cap) : '');
  const [uploading, setUploading] = useState<'image' | 'video' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const activeAdvertisers = advertisers.filter((a) => a.status === 'active');

  async function handleUpload(file: File | undefined, kind: 'image' | 'video'): Promise<void> {
    if (!file) return;
    if (!supabase) { window.alert('Backend non configuré'); return; }
    setFormError(null);
    setUploading(kind);
    try {
      const ext = (file.name.split('.').pop() ?? (kind === 'video' ? 'mp4' : 'jpg')).toLowerCase();
      const path = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('ad-media').upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (error) {
        setFormError('Upload échoué : ' + error.message);
        return;
      }
      const { data } = supabase.storage.from('ad-media').getPublicUrl(path);
      if (!data?.publicUrl) {
        setFormError('Impossible de récupérer l’URL publique du média.');
        return;
      }
      if (kind === 'image') setImage(data.publicUrl); else setVideo(data.publicUrl);
    } finally {
      setUploading(null);
    }
  }

  return (
    <form
      className="ad-form"
      onSubmit={(e) => {
        e.preventDefault();
        setFormError(null);
        if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
          setFormError('La date de fin doit être postérieure à la date de début.');
          return;
        }
        onSubmit({
          advertiser_id: advertiserId,
          name,
          type,
          content: { title, subtitle, cta, url, eyebrow, legal, variant, image: image || undefined, video: video || undefined },
          weight,
          frequency_cap_per_user: freqCap,
          start_at: startAt ? new Date(startAt).toISOString() : undefined,
          end_at: endAt ? new Date(endAt).toISOString() : null,
          impression_cap: imprCap.trim() === '' ? null : Number(imprCap),
          click_cap: clickCap.trim() === '' ? null : Number(clickCap),
        });
      }}
    >
      <div className="ad-form-row">
        <label>
          <span>Annonceur *</span>
          <select value={advertiserId} onChange={(e) => setAdvertiserId(e.target.value)} required>
            <option value="">— Sélectionner —</option>
            {activeAdvertisers.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Nom campagne *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Alpha Import — Découverte" />
        </label>
      </div>
      {formError && (
        <div className="ad-form-error" role="alert" aria-live="assertive">{formError}</div>
      )}
      <div className="ad-form-row">
        <label>
          <span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as CampaignType)}>
            <option value="preroll">Pré-roll</option>
            <option value="banner">Bannière</option>
            <option value="both">Pré-roll + Bannière</option>
          </select>
        </label>
        <label>
          <span>Style</span>
          <select value={variant} onChange={(e) => setVariant(e.target.value as 'souverain' | 'corridor')}>
            <option value="souverain">Souverain</option>
            <option value="corridor">Corridor</option>
          </select>
        </label>
        <label>
          <span>Poids (1-100)</span>
          <input type="number" min={1} max={100} value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
        </label>
        <label>
          <span>Cap fréquence/jour</span>
          <input type="number" min={1} max={20} value={freqCap} onChange={(e) => setFreqCap(Number(e.target.value))} />
        </label>
      </div>

      <div className="ad-form-row">
        <label>
          <span>Image (upload ou URL)</span>
          <input type="file" accept="image/*" disabled={uploading !== null}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) void handleUpload(file, 'image');
              e.currentTarget.value = '';
            }} />
          <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://… (ou via upload)" />
          {uploading === 'image' && <span className="u-time-ago">Upload en cours…</span>}
          {image && <img src={image} alt="aperçu" style={{ maxHeight: 70, borderRadius: 6, marginTop: 6, objectFit: 'cover' }} />}
        </label>
        <label>
          <span>Vidéo pré-roll (upload ou URL)</span>
          <input type="file" accept="video/mp4,video/webm" disabled={uploading !== null}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) void handleUpload(file, 'video');
              e.currentTarget.value = '';
            }} />
          <input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://… .mp4 (ou via upload)" />
          {uploading === 'video' && <span className="u-time-ago">Upload en cours…</span>}
          {video && <video src={video} muted controls style={{ maxHeight: 70, borderRadius: 6, marginTop: 6 }} />}
        </label>
      </div>

      <label>
        <span>Titre *</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="La passerelle sécurisée vers le monde" />
      </label>
      <label>
        <span>Sous-titre</span>
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Entre Kinshasa et les géants économiques" />
      </label>
      <div className="ad-form-row">
        <label>
          <span>Sur-titre (eyebrow)</span>
          <input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="Facilitation d'achats · Sourcing" />
        </label>
        <label>
          <span>CTA</span>
          <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Découvrir la plateforme" />
        </label>
      </div>
      <label>
        <span>URL de destination (avec UTM)</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://...?utm_source=iptv-player&utm_medium=preroll" />
      </label>

      <div className="ad-form-row">
        <label>
          <span>Début de diffusion</span>
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} max={endAt || undefined} />
        </label>
        <label>
          <span>Fin de diffusion (vide = sans fin)</span>
          <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} min={startAt || undefined} />
        </label>
      </div>
      <div className="ad-form-row">
        <label>
          <span>Quota impressions (vide = illimité)</span>
          <input type="number" min={0} value={imprCap} onChange={(e) => setImprCap(e.target.value)} placeholder="ex : 100000" />
        </label>
        <label>
          <span>Quota clics (vide = illimité)</span>
          <input type="number" min={0} value={clickCap} onChange={(e) => setClickCap(e.target.value)} placeholder="ex : 5000" />
        </label>
      </div>

      <label>
        <span>Mentions légales</span>
        <textarea value={legal} onChange={(e) => setLegal(e.target.value)} rows={2}
          placeholder="A.Onoseke House Investment RDC · RCCM CD/KNM/RCCM/21-A-01949 ..." />
      </label>
      <div className="ad-form-actions">
        <button type="button" className="ad-btn ad-btn--ghost" onClick={onCancel}>Annuler</button>
        <button type="submit" className="ad-btn ad-btn--primary" disabled={uploading !== null}>Enregistrer</button>
      </div>
    </form>
  );
}
