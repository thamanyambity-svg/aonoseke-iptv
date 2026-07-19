export function fmtDate(s: string | null): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return s;
  }
}

export function fmtNumber(n: number): string {
  return n.toLocaleString('fr-FR');
}

export function fmtPercent(n: number): string {
  return `${n.toFixed(2)} %`.replace('.', ',');
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Actif', paused: 'En pause', archived: 'Archivé',
    draft: 'Brouillon', ended: 'Terminé',
  };
  return labels[status] ?? status;
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'var(--lime, #84cc16)',
    paused: 'var(--accent, #C98A1B)',
    archived: 'var(--text-3)',
    draft: 'var(--text-3)',
    ended: 'var(--text-3)',
  };
  return colors[status] ?? 'var(--text-3)';
}

export function csvEscape(value: unknown): string {
  if (value == null) return '';
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return '';
  const s = String(value);
  const escaped = s.replace(/"/g, '""');
  const needsQuote = /[,"\n\r]/.test(s) || /^[=+\-@\t\r]/.test(s);
  const quoted = needsQuote ? `"${escaped}"` : escaped;
  if (/^[=+\-@]/.test(quoted)) return `'${quoted}`;
  return quoted;
}

export function downloadCsv(filename: string, header: string, rows: (string | number)[][]): void {
  const csv = header + '\n' + rows.map((r) => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
