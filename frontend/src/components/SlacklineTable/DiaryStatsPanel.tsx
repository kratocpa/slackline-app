import { useDiaryStats } from '../../api/hooks';
import UserStatsPanel from './UserStatsPanel';

export default function DiaryStatsPanel() {
  const { data, isLoading, isError } = useDiaryStats(true);

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading statistics…</div>;
  if (isError)   return <div className="p-8 text-center text-red-400">Failed to load statistics.</div>;
  if (!data)     return null;

  return <UserStatsPanel data={data} />;
}
