import { useState } from 'react';
import type { Advertiser } from '../../hooks/useAdvertisers';

interface AdvertiserFormProps {
  initial?: Partial<Advertiser>;
  onSubmit: (data: { name: string; contact_name: string; contact_email: string; phone: string; logo_url: string; notes: string }) => void;
  onCancel: () => void;
}

export function AdvertiserForm({ initial, onSubmit, onCancel }: AdvertiserFormProps): JSX.Element {
  const [name, setName] = useState(initial?.name ?? '');
  const [contactName, setContactName] = useState(initial?.contact_name ?? '');
  const [contactEmail, setContactEmail] = useState(initial?.contact_email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  return (
    <form
      className="ad-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, contact_name: contactName, contact_email: contactEmail, phone, logo_url: logoUrl, notes });
      }}
    >
      <div className="ad-form-row">
        <label>
          <span>Nom *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="A.Onoseke House Investment" />
        </label>
        <label>
          <span>Contact</span>
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nom du contact" />
        </label>
      </div>
      <div className="ad-form-row">
        <label>
          <span>Email contact</span>
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@société.com" />
        </label>
        <label>
          <span>Téléphone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243 ..." />
        </label>
      </div>
      <label>
        <span>URL logo</span>
        <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
      </label>
      <label>
        <span>Notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes internes (conditions, tarifs...)" />
      </label>
      <div className="ad-form-actions">
        <button type="button" className="ad-btn ad-btn--ghost" onClick={onCancel}>Annuler</button>
        <button type="submit" className="ad-btn ad-btn--primary">Enregistrer</button>
      </div>
    </form>
  );
}
