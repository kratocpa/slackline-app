/**
 * Reusable stats panel for a given DiaryStatsResponse.
 * Used both in Diary tab and in Slackliners detail view.
 */
import { Component, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { DiaryStatsResponse } from '../../types';

// Soft, tasteful palette — muted but distinct, easy on the eyes
const PALETTE = [
  '#6ea8d8', // soft blue
  '#76b8a8', // muted teal
  '#a08ec8', // dusty violet
  '#e89a6a', // warm sand
  '#7cc48a', // sage green
  '#c87a8a', // dusty rose
  '#6ab8c8', // sky teal
  '#b8a86a', // warm olive
  '#8898d8', // periwinkle
  '#c8a878', // caramel
];

class ChartErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { error: false }; }
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error)
      return <div className="text-center text-sm text-slate-400 py-4">Chart could not be rendered.</div>;
    return this.props.children;
  }
}

function SimpleBar({ data, nameKey }: { data: { [k: string]: any; count: number }[]; nameKey: string }) {
  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 40 }} barCategoryGap="28%">
          <XAxis dataKey={nameKey} tick={{ fontSize: 11, fill: '#94a3b8' }} angle={-30} textAnchor="end" interval={0} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(100,120,160,0.06)' }}
            contentStyle={{ border: 'none', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,.10)', fontSize: 12 }}
            formatter={(val: any) => [val, 'count']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((_d, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface Props { data: DiaryStatsResponse }

export default function UserStatsPanel({ data }: Props) {
  const navigate = useNavigate();

  const styleData = data.style_distribution.map(s => ({
    name: s.style?.trim() || 'Unknown',
    count: s.count,
  }));

  const topLines = data.most_crossed.filter(l => l.crossing_count > 1);

  return (
    <div className="p-6 space-y-8 max-w-3xl">

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-center">
          <div className="text-4xl font-semibold text-slate-700">{data.total_lines}</div>
          <div className="text-xs text-slate-400 mt-1 uppercase tracking-wide">Lines Crossed</div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-center">
          <div className="text-4xl font-semibold text-slate-700">{data.total_crossings}</div>
          <div className="text-xs text-slate-400 mt-1 uppercase tracking-wide">Total Crossings</div>
        </div>
      </div>

      {data.total_lines === 0 && (
        <div className="text-center py-10 text-slate-300 text-sm">No crossings recorded yet.</div>
      )}

      {styleData.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Crossings by Style</h4>
          <ChartErrorBoundary>
            <SimpleBar data={styleData} nameKey="name" />
          </ChartErrorBoundary>
        </section>
      )}

      {data.length_distribution.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Lines by Length</h4>
          <ChartErrorBoundary>
            <SimpleBar data={data.length_distribution} nameKey="bucket" />
          </ChartErrorBoundary>
        </section>
      )}

      {data.height_distribution.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Lines by Height</h4>
          <ChartErrorBoundary>
            <SimpleBar data={data.height_distribution} nameKey="bucket" />
          </ChartErrorBoundary>
        </section>
      )}

      {topLines.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Most Visited Lines</h4>
          <div className="space-y-1">
            {topLines.map((line, i) => (
              <div
                key={line.id}
                onClick={() => navigate(`/slacklines/${line.id}`)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <span className="w-5 h-5 flex items-center justify-center text-xs font-semibold text-slate-400 shrink-0">{i + 1}</span>
                <span className="flex-1 text-sm text-slate-700 group-hover:text-slate-900 truncate">{line.name}</span>
                <span className="text-xs font-medium text-slate-400 shrink-0">{line.crossing_count}×</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
