import { useNavigate } from 'react-router-dom';
import type { SlacklineListResponse } from '../../types';

const PAGE_SIZES = [25, 50, 75, 100];
const WINDOW = 3; // pages on each side of current

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

interface Props {
  data?: SlacklineListResponse;
  isLoading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  sortBy: string;
  sortDir: string;
  onSort: (col: string) => void;
}

export default function SlacklineTable({
  data, isLoading, page, pageSize, onPageChange, onPageSizeChange, sortBy, sortDir, onSort,
}: Props) {
  const navigate = useNavigate();

  const cols = [
    { key: 'name',       label: 'Name' },
    { key: 'state',      label: 'State' },
    { key: 'region',     label: 'Region' },
    { key: 'length',     label: 'Length (m)' },
    { key: 'height',     label: 'Height (m)' },
    { key: 'rating',     label: 'Rating' },
    { key: 'date_tense', label: 'First Rigged' },
  ];

  const arrow = (col: string) =>
    sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  if (isLoading) return <div className="p-4 text-center text-gray-500">Loading...</div>;

  const pages = buildPageWindow(page, data?.pages ?? 0);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {cols.map((c) => (
                <th key={c.key} onClick={() => onSort(c.key)}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700">
                  {c.label}{arrow(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.items.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No slacklines found.</td></tr>
            )}
            {data?.items.map((s) => (
              <tr key={s.id} onClick={() => navigate(`/slacklines/${s.id}`)}
                className="hover:bg-blue-50 cursor-pointer">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.state ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.region ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.length ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.height ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.rating ? '★'.repeat(s.rating) : '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {s.date_tense ? new Date(s.date_tense).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t bg-gray-50">
        {/* Left: total + page size picker */}
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{data?.total ?? 0} results</span>
          <span className="text-gray-300">|</span>
          <span>Show:</span>
          <div className="flex gap-1">
            {PAGE_SIZES.map((s) => (
              <button key={s} onClick={() => { onPageSizeChange(s); onPageChange(1); }}
                className={`px-2 py-0.5 rounded border text-xs font-medium transition-colors ${
                  pageSize === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Right: page window */}
        {data && data.pages > 1 && (
          <div className="flex items-center gap-1">
            {/* Prev */}
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded border text-gray-500 hover:text-blue-600 hover:border-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            {/* Page numbers */}
            {pages.map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
              ) : (
                <button key={p} onClick={() => onPageChange(p as number)}
                  className={`w-8 h-8 flex items-center justify-center rounded border text-sm font-medium transition-colors ${
                    p === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                  }`}>
                  {p}
                </button>
              )
            )}

            {/* Next */}
            <button onClick={() => onPageChange(page + 1)} disabled={page >= (data?.pages ?? 1)}
              className="w-8 h-8 flex items-center justify-center rounded border text-gray-500 hover:text-blue-600 hover:border-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
