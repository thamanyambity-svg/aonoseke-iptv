import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { GeoPoint } from './WorldMap.tsx';

/**
 * Carte Mapbox (style sombre) avec points or pour chaque utilisateur localisé.
 * Chargée en lazy depuis le dashboard pour ne pas alourdir le bundle principal.
 */
export default function MapboxMap({ points, token }: { points: GeoPoint[]; token: string }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ref.current || mapRef.current || failed) return;
    try {
      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: ref.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [12, 8],
        zoom: 1.1,
        attributionControl: false,
        cooperativeGestures: true,
        preserveDrawingBuffer: true,
      });
      mapRef.current = map;
      return () => { map.remove(); mapRef.current = null; };
    } catch (err) {
      console.error('MapboxMap failed to initialize', err);
      setFailed(true);
    }
  }, [token, failed]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const features = points
      .filter((p) => typeof p.lat === 'number' && typeof p.lon === 'number')
      .map((p) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
        properties: {},
      }));
    const data = { type: 'FeatureCollection' as const, features };
    const apply = (): void => {
      const src = map.getSource('users') as mapboxgl.GeoJSONSource | undefined;
      if (src) { src.setData(data); return; }
      map.addSource('users', { type: 'geojson', data });
      map.addLayer({
        id: 'users-glow', type: 'circle', source: 'users',
        paint: { 'circle-radius': 11, 'circle-color': '#c9a84c', 'circle-opacity': 0.22, 'circle-blur': 0.8 },
      });
      map.addLayer({
        id: 'users-dot', type: 'circle', source: 'users',
        paint: { 'circle-radius': 4, 'circle-color': '#f1dd96', 'circle-stroke-width': 1, 'circle-stroke-color': '#0d0a04' },
      });
    };
    if (map.isStyleLoaded()) apply(); else map.once('load', apply);
  }, [points]);

  if (failed) {
    return (
      <div className="mapbox-map mapbox-map--failed">
        <div className="mapbox-fallback">
          <strong>Carte Mapbox indisponible</strong>
          <p>Le chargement de la carte a échoué. Vérifiez le token Mapbox ou rechargez la page.</p>
        </div>
      </div>
    );
  }

  return <div ref={ref} className="mapbox-map" />;
}
