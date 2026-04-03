import type { SlacklineDetail, PointResponse } from '../../types';

interface Props { data: SlacklineDetail; }

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">{value ?? <span className="text-gray-300">—</span>}</dd>
    </div>
  );
}

function PointBlock({ label, point }: { label: string; point: PointResponse }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <span className="text-xs text-gray-400 block">Latitude</span>
          <span className="text-sm font-mono text-gray-700">{point.latitude.toFixed(6)}</span>
        </div>
        <div>
          <span className="text-xs text-gray-400 block">Longitude</span>
          <span className="text-sm font-mono text-gray-700">{point.longitude.toFixed(6)}</span>
        </div>
        <div>
          <span className="text-xs text-gray-400 block">Description</span>
          <span className="text-sm text-gray-700">{point.description || <span className="text-gray-300">—</span>}</span>
        </div>
      </div>
    </div>
  );
}

/** Simple horizontal bar icon — represents length */
function LengthIcon() {
  return (
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="3.5" width="18" height="3" rx="1.5" fill="currentColor" opacity="0.85"/>
      <rect x="0" y="0" width="2.5" height="10" rx="1.25" fill="currentColor"/>
      <rect x="15.5" y="0" width="2.5" height="10" rx="1.25" fill="currentColor"/>
    </svg>
  );
}

/** Simple vertical bar icon — represents height */
function HeightIcon() {
  return (
    <svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3.5" y="0" width="3" height="18" rx="1.5" fill="currentColor" opacity="0.85"/>
      <rect x="0" y="0" width="10" height="2.5" rx="1.25" fill="currentColor"/>
      <rect x="0" y="15.5" width="10" height="2.5" rx="1.25" fill="currentColor"/>
    </svg>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-200'}>★</span>
      ))}
    </div>
  );
}

export default function InfoTab({ data }: Props) {
  const location = [data.sector, data.region, data.state].filter(Boolean).join(', ');

  return (
    <div className="divide-y divide-gray-100">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row">

        {/* Cover image — only when present, constrained to ~35% width */}
        {data.cover_image_url && (
          <div className="sm:w-[35%] shrink-0">
            <div className="relative w-full h-full min-h-40 max-h-64 sm:max-h-none overflow-hidden bg-gray-100">
              <img
                src={data.cover_image_url}
                alt={data.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Name + meta panel */}
        <div className="flex-1 px-6 py-6 flex flex-col justify-center gap-2 bg-gradient-to-br from-slate-50 to-blue-50/40">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">{data.name}</h2>

          {data.rating ? <Stars rating={data.rating} /> : null}

          {/* Stat pills */}
          <div className="flex flex-wrap gap-2 mt-1">
            {data.length != null && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                <LengthIcon />
                {data.length} m
              </span>
            )}
            {data.height != null && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
                <HeightIcon />
                {data.height} m
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                {location}
              </span>
            )}
            {data.author && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                {data.author}
              </span>
            )}
          </div>

          {/* Description */}
          {data.description && (
            <p className="mt-1 text-sm text-gray-600 leading-relaxed max-w-prose">{data.description}</p>
          )}
        </div>
      </div>

      {/* ── DETAILS ──────────────────────────────────────────────── */}
      <div className="px-6 py-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Details</h3>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
          <Field label="Time Approach"   value={data.time_approach} />
          <Field label="Rigging Time"    value={data.time_tensioning} />
          <Field label="First Rigged"    value={data.date_tense} />
          <Field label="Type"            value={data.type} />
          <Field label="Restriction"     value={data.restriction} />
          <Field label="Name History"    value={data.name_history} />
        </dl>
      </div>

      {/* ── ANCHOR POINTS & PARKING ───────────────────────────────── */}
      {(data.first_anchor_point || data.second_anchor_point || data.parking_spot) && (
        <div className="px-6 py-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Anchor Points & Parking</h3>
          <div className="space-y-2">
            {data.first_anchor_point  && <PointBlock label="Anchor 1 (First)"  point={data.first_anchor_point} />}
            {data.second_anchor_point && <PointBlock label="Anchor 2 (Second)" point={data.second_anchor_point} />}
            {data.parking_spot        && <PointBlock label="Parking Spot"       point={data.parking_spot} />}
          </div>
        </div>
      )}

      {/* ── META ─────────────────────────────────────────────────── */}
      <div className="px-6 py-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
          <Field label="Created" value={data.created_at ? new Date(data.created_at).toLocaleString() : null} />
          <Field label="Updated" value={data.updated_at ? new Date(data.updated_at).toLocaleString() : null} />
        </dl>
      </div>

    </div>
  );
}
