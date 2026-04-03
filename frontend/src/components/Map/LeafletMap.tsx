import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import type { PointResponse } from '../../types';
import { useMapStore } from '../../store/mapStore';
// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
function BoundsUpdater() {
  const map = useMap();
  const setBounds = useMapStore((s) => s.setBounds);
  useEffect(() => {
    const update = () => {
      const b = map.getBounds();
      setBounds(`${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`);
    };
    map.on('moveend', update);
    update();
    return () => { map.off('moveend', update); };
  }, [map, setBounds]);
  return null;
}

export interface MapItem {
  id: number;
  name: string;
  length?: number | null;
  height?: number | null;
  rating?: number | null;
  first_anchor?: PointResponse | null;
}

interface Props {
  slacklines: MapItem[];
}
export default function LeafletMap({ slacklines }: Props) {
  const navigate = useNavigate();
  const markers = slacklines.filter((s) => s.first_anchor);
  return (
    <MapContainer center={[49.8, 15.5]} zoom={7} className="h-full w-full rounded-lg">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      <BoundsUpdater />
      {markers.map((s) => (
        <Marker
          key={s.id}
          position={[s.first_anchor!.latitude, s.first_anchor!.longitude]}
          eventHandlers={{ click: () => navigate(`/slacklines/${s.id}`) }}
        >
          <Popup>
            <strong>{s.name}</strong><br />
            {s.length && `${s.length}m`} {s.height && `/ ${s.height}m`}
            {s.rating && ` ★${s.rating}`}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
