import { useState } from 'react';
import { useHistory } from '../../api/hooks';
interface Props { slacklineId: number; }
export default function HistoryTab({ slacklineId }: Props) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useHistory(slacklineId, { page, page_size: 20 });
  if (isLoading) return <div className="p-4 text-gray-500">Loading history...</div>;
  if (!data?.items.length) return <div className="p-4 text-gray-400">No changes recorded yet.</div>;
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Change History</h3>
      <div className="space-y-4">
        {data.items.map((h) => (
          <div key={h.id} className="border-l-4 border-blue-400 pl-4 py-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">{h.user?.username ?? 'Unknown'}</span>
              <span>—</span>
              <span>{new Date(h.changed_at).toLocaleString()}</span>
            </div>
            <div className="mt-1 space-y-1">
              {Object.entries(h.changes).map(([field, change]) => (
                <div key={field} className="text-sm">
                  <span className="font-medium text-gray-700">{field}:</span>{' '}
                  <span className="text-red-500 line-through">{String(change.old ?? '(empty)')}</span>
                  {' → '}
                  <span className="text-green-600">{String(change.new ?? '(empty)')}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {data.pages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-gray-600">Page {data.page} of {data.pages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1 text-sm border rounded disabled:opacity-40">Prev</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= data.pages}
              className="px-3 py-1 text-sm border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
