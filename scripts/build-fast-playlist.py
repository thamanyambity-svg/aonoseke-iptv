#!/usr/bin/env python3
"""
Génère public/playlist.json à partir des sources FAST (Free Ad-Supported TV).

Modèle A — contenu 100% légal et monétisable :
les flux Pluto TV contiennent des publicités intégrées par le diffuseur
(serverSideAds=true), ce qui autorise la rediffusion et la monétisation.

Source : i.mjh.nz (agrégateur de Matt Huisman)
Flux    : redirection jmp2.uk/plu-{channelId}.m3u8

Usage :
    python3 scripts/build-fast-playlist.py
"""
import json
import re
import gzip
import ssl
import subprocess
import urllib.request
import os

PLUTO_CHANNELS = 'https://i.mjh.nz/PlutoTV/.channels.json.gz'
REGIONS = ['fr', 'us']  # francophone + catalogue anglophone (films/séries/news)

COUNTRY_BY_REGION = {
    'fr': 'FR', 'us': 'US', 'gb': 'GB', 'ca': 'CA',
    'de': 'DE', 'es': 'ES', 'it': 'IT', 'br': 'BR', 'mx': 'MX',
}

OUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', 'playlist.json')


def clean(s: str) -> str:
    return re.sub(r'\s+', ' ', (s or '')).strip()


def fetch_gz_json(url: str) -> dict:
    """Télécharge un JSON gzippé. TLS vérifié dans les deux chemins.

    1) urllib avec le bundle CA de certifi si disponible (sinon défaut système).
    2) Fallback curl, qui vérifie via le trust store du système.
    """
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        try:
            import certifi
            ctx = ssl.create_default_context(cafile=certifi.where())
        except ImportError:
            ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
            return json.loads(gzip.decompress(resp.read()))
    except Exception:
        # curl vérifie le certificat via le trust store système (pas de -k)
        raw = subprocess.check_output(['curl', '-sSL', '--max-time', '30', url])
        return json.loads(gzip.decompress(raw))


def build_pluto(data: dict, regions: list[str]) -> list[dict]:
    out, seen = [], set()
    for reg in regions:
        rd = data['regions'].get(reg)
        if not rd:
            continue
        country = COUNTRY_BY_REGION.get(reg, reg.upper())
        for cid, c in rd['channels'].items():
            if cid in seen:
                continue
            seen.add(cid)
            name = clean(c.get('name'))
            if not name:
                continue
            out.append({
                'name': name,
                'country': country,
                'group': clean(c.get('group')) or 'Pluto TV',
                'logo': c.get('logo') or '',
                'url': f'https://jmp2.uk/plu-{cid}.m3u8',
            })
    return out


def main() -> None:
    print('Téléchargement du catalogue Pluto TV…')
    data = fetch_gz_json(PLUTO_CHANNELS)
    channels = build_pluto(data, REGIONS)
    print(f'{len(channels)} chaînes FAST générées ({", ".join(REGIONS)})')

    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(channels, f, ensure_ascii=False, indent=2)
    print(f'Écrit dans {os.path.normpath(OUT_PATH)}')


if __name__ == '__main__':
    main()
