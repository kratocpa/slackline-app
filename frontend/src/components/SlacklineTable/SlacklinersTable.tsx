import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSlackliners, useSlacklinerStats, useSlacklinerLines, useSlacklinerInfo } from '../../api/hooks';
import type { SlacklinerItem, SlacklinerLineItem, SlacklinerLinesResponse } from '../../types';
import UserStatsPanel from './UserStatsPanel';

const PAGE_SIZES = [25, 50, 75, 100];
const WINDOW = 3;

function buildPageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 1) return [];
  const pages: (number | '…')[] = [];
  const lo = Math.max(1, current - WINDOW);
  const hi = Math.min(total, current + WINDOW);
  if (lo > 1) { pages.push(1); if (lo > 2) pages.push('…'); }
  for (let p = lo; p <= hi; p++) pages.push(p);
  if (hi < total) { if (hi < total - 1) pages.push('…'); pages.push(total); }
  return pages;
}

function Avatar({ item }: { item: SlacklinerItem }) {
  if (item.avatar_url) {
    return <img src={item.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />;
  }
  const initials = (item.display_name || item.username).slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-500 shrink-0">
      {initials}
    </div>
  );
}

// ── Lines sub-tab ──────────────────────────────────────────────────────────────

function LinesTab({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('last_crossing_date');
  const [sortDir, setSortDir] = useState('desc');

  const { data, isLoading } = useSlacklinerLines(userId, { page, page_size: pageSize, sort_by: sortBy, sort_dir: sortDir });

  const cols = [
    { key: 'name',               label: 'Name' },
    { key: 'state',              label: 'State' },
    { key: 'region',             label: 'Region' },
    { key: 'length',             label: 'Length (m)' },
    { key: 'height',             label: 'Height (m)' },
    { key: 'rating',             label: 'Rating' },
    { key: 'last_crossing_date', label: 'Last Crossed' },
    { key: 'crossing_count',     label: 'Crossings' },
  ];

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
    setPage(1);
  };

  const arrow = (col: string) => sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  if (isLoading) return <div className="p-6 text-center text-slate-400">Loading…</div>;

  const pages = buildPageWindow(page, data?.pages ?? 0);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {cols.map(c => (
                <th key={c.key} onClick={() => handleSort(c.key)}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700">
                  {c.label}{arrow(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(data?.items ?? []).length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No crossings yet.</td></tr>
            )}
            {(data?.items ?? []).map((s: SlacklinerLineItem) => (
              <tr key={s.id} onClick={() => navigate(`/slacklines/${s.id}`)}
                className="hover:bg-blue-50 cursor-pointer">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.state ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.region ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.length ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.height ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.rating ? '★'.repeat(s.rating) : '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {s.last_crossing_date ? new Date(s.last_crossing_date).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.crossing_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t bg-gray-50">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{data?.total ?? 0} results</span>
          <span className="text-gray-300">|</span>
          <span>Show:</span>
          <div className="flex gap-1">
            {PAGE_SIZES.map(s => (
              <button key={s} onClick={() => { setPageSize(s); setPage(1); }}
                className={`px-2 py-0.5 rounded border text-xs font-medium transition-colors ${
                  pageSize === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}>{s}</button>
            ))}
          </div>
        </div>
        {pages.length > 0 && (
          <div className="flex items-center gap-1">
            {pages.map((p, i) =>
              p === '…'
                ? <span key={`e${i}`} className="px-1 text-gray-400">…</span>
                : <button key={p} onClick={() => setPage(p as number)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      page === p ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-blue-50'
                    }`}>{p}</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── User detail view (Lines + Stats tabs) ──────────────────────────────────────

type SubTab = 'lines' | 'stats';

function SlacklinerDetail({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [subTab, setSubTab] = useState<SubTab>('lines');
  const { data: info } = useSlacklinerInfo(userId);
  const { data: statsData, isLoading: statsLoading, isError: statsError } = useSlacklinerStats(userId, subTab === 'stats');

  const displayName = info?.display_name || info?.username || '…';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-100">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors mr-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        {info?.avatar_url
          ? <img src={info.avatar_url} alt="" className="w-9 h-9 rounded-full border border-slate-200 object-cover" />
          : <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-500">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
        }
        <div>
          <div className="font-semibold text-slate-800 text-base">{displayName}</div>
          {info?.display_name && <div className="text-xs text-slate-400">@{info.username}</div>}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-gray-100 px-4 flex gap-1 bg-gray-50">
        {(['lines', 'stats'] as SubTab[]).map(st => (
          <button key={st} onClick={() => setSubTab(st)}
            className={`py-2 px-3 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${
              subTab === st ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            {st === 'lines' ? 'Lines' : 'Statistics'}
          </button>
        ))}
      </div>

      {subTab === 'lines' && <LinesTab userId={userId} />}

      {subTab === 'stats' && (
        statsLoading
          ? <div className="p-8 text-center text-slate-400">Loading statistics…</div>
          : statsError
            ? <div className="p-8 text-center text-red-400">Failed to load statistics.</div>
            : statsData
              ? <UserStatsPanel data={statsData} />
              : null
      )}
    </div>
  );
}

// ── Main list ──────────────────────────────────────────────────────────────────

interface SlacklinersTableProps {
  onUserSelect?: (userId: string | null) => void;
}

export default function SlacklinersTable({ onUserSelect }: SlacklinersTableProps) {
  const { data, isLoading, isError } = useSlackliners();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selectUser = (id: string | null) => {
    setSelectedUserId(id);
    onUserSelect?.(id);
  };

  if (selectedUserId) {
    return <SlacklinerDetail userId={selectedUserId} onBack={() => selectUser(null)} />;
  }

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading…</div>;
  if (isError) return <div className="p-8 text-center text-red-400">Failed to load slackliners.</div>;

  const items = data?.items ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">User</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Lines Crossed</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Last 30 days</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Longest (m)</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Highest (m)</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-50">
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-slate-300 text-sm">No registered users yet.</td>
            </tr>
          )}
          {items.map(u => (
            <tr key={u.id} onClick={() => selectUser(u.id)}
              className="hover:bg-slate-50 cursor-pointer transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar item={u} />
                  <div>
                    <div className="text-sm font-medium text-slate-800">{u.display_name || u.username}</div>
                    {u.display_name && <div className="text-xs text-slate-400">@{u.username}</div>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right text-sm text-slate-700 font-medium">{u.crossed_lines}</td>
              <td className="px-4 py-3 text-right text-sm text-slate-600">{u.crossed_lines_last_30d}</td>
              <td className="px-4 py-3 text-right text-sm text-slate-600">{u.longest_crossed ?? '—'}</td>
              <td className="px-4 py-3 text-right text-sm text-slate-600">{u.highest_crossed ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
