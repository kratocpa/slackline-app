import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { useSlacklineDetail } from '../api/hooks';
import { useAuthStore } from '../store/authStore';
import InfoTab from '../components/SlacklineDetail/InfoTab';
import CrossingsTab from '../components/SlacklineDetail/CrossingsTab';
import HistoryTab from '../components/SlacklineDetail/HistoryTab';
import StatisticsTab from '../components/SlacklineDetail/StatisticsTab';
import PhotosTab from '../components/SlacklineDetail/PhotosTab';
import SlacklineForm from '../components/SlacklineForm/SlacklineForm';
import LoginButton from '../components/Auth/LoginButton';

const TABS = ['Information', 'Crossings', 'Photos', 'History', 'Statistics'] as const;
type Tab = typeof TABS[number];

export default function SlacklineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const slacklineId = Number(id);
  const navigate = useNavigate();
  const { data, isLoading } = useSlacklineDetail(slacklineId);
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<Tab>('Information');
  const [editing, setEditing] = useState(false);

  // ── early returns AFTER hooks ─────────────────────────────────────────────
  if (isLoading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>;
  if (!data) return <div className="flex items-center justify-center h-screen text-gray-500">Slackline not found</div>;

  const canEdit = user && (user.is_admin || user.id === data.created_by_id);
  const hasCoords = data.first_anchor_point || data.second_anchor_point;
  const positions: [number, number][] = [];
  if (data.first_anchor_point?.latitude != null) positions.push([data.first_anchor_point.latitude as number, data.first_anchor_point.longitude as number]);
  if (data.second_anchor_point?.latitude != null) positions.push([data.second_anchor_point.latitude as number, data.second_anchor_point.longitude as number]);
  const center: [number, number] = positions.length > 0 ? positions[0] : [49.8, 15.5];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} title="Back"
              className="flex items-center justify-center w-9 h-9 rounded-full text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900">{data.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            {canEdit && !editing && (
              <button onClick={() => setEditing(true)}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm">
                Edit
              </button>
            )}
            <LoginButton />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {editing && (
          <div className="bg-white rounded-lg shadow p-6">
            <SlacklineForm initial={data} onClose={() => setEditing(false)} />
          </div>
        )}
        {hasCoords && (
          <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '300px' }}>
            <MapContainer center={center} zoom={14} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors" />
              {data.first_anchor_point && (
                <Marker position={[data.first_anchor_point.latitude as number, data.first_anchor_point.longitude as number]}>
                  <Popup>Anchor 1</Popup>
                </Marker>
              )}
              {data.second_anchor_point && (
                <Marker position={[data.second_anchor_point.latitude as number, data.second_anchor_point.longitude as number]}>
                  <Popup>Anchor 2</Popup>
                </Marker>
              )}
              {data.parking_spot && (
                <Marker position={[data.parking_spot.latitude as number, data.parking_spot.longitude as number]}>
                  <Popup>Parking</Popup>
                </Marker>
              )}
              {positions.length === 2 && <Polyline positions={positions} color="red" weight={3} />}
            </MapContainer>
          </div>
        )}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <nav className="flex -mb-px">
              {TABS.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab}
                </button>
              ))}
            </nav>
          </div>
          {activeTab === 'Information' && <InfoTab data={data} />}
          {activeTab === 'Crossings'   && <CrossingsTab slacklineId={slacklineId} />}
          {activeTab === 'Photos'      && <PhotosTab slacklineId={slacklineId} />}
          {activeTab === 'History'     && <HistoryTab slacklineId={slacklineId} />}
          {activeTab === 'Statistics'  && <StatisticsTab slacklineId={slacklineId} />}
        </div>
      </main>
    </div>
  );
}
