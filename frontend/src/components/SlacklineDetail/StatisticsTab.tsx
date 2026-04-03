import { Component, ReactNode } from 'react';
import { useStatistics } from '../../api/hooks';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

class ChartErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { error: false }; }
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) return <div className="text-center text-sm text-red-400 py-4">Chart could not be rendered.</div>;
    return this.props.children;
  }
}

interface Props { slacklineId: number; }

export default function StatisticsTab({ slacklineId }: Props) {
  const { data, isLoading, isError } = useStatistics(slacklineId);

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading statistics...</div>;
  if (isError)   return <div className="p-8 text-center text-red-500">Failed to load statistics.</div>;
  if (!data)     return <div className="p-8 text-center text-gray-400">No statistics available.</div>;

  const styleData = (data.style_distribution ?? []).filter(
    (s: any) => s && s.style != null && s.count != null
  );
  const userData = (data.top_users ?? []).filter(
    (u: any) => u && u.username != null && u.count != null
  );

  return (
    <div className="p-4 space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-700">{data.total_crossings}</div>
          <div className="text-sm text-blue-600 mt-1">Total Crossings</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-700">
            {data.average_rating != null ? Number(data.average_rating).toFixed(1) : '—'}
          </div>
          <div className="text-sm text-green-600 mt-1">Average Rating</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-purple-700">{styleData.length}</div>
          <div className="text-sm text-purple-600 mt-1">Different Styles</div>
        </div>
      </div>

      {data.total_crossings === 0 && (
        <div className="text-center py-8 text-gray-400">
          No crossings recorded yet. Be the first to add one!
        </div>
      )}

      {/* Style Distribution */}
      {styleData.length > 0 && (
        <div>
          <h4 className="text-md font-semibold mb-3 text-gray-700">Style Distribution</h4>
          <ChartErrorBoundary>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={styleData} dataKey="count" nameKey="style"
                    cx="50%" cy="50%" outerRadius={90}
                    label={({ style, count }: any) => `${style} (${count})`}
                  >
                    {styleData.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [val, 'Crossings']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartErrorBoundary>
        </div>
      )}

      {/* Top Users */}
      {userData.length > 0 && (
        <div>
          <h4 className="text-md font-semibold mb-3 text-gray-700">Top Users</h4>
          <ChartErrorBoundary>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="username" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val: any) => [val, 'Crossings']} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartErrorBoundary>
        </div>
      )}
    </div>
  );
}
