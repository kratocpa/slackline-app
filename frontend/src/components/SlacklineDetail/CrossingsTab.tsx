import { useState } from 'react';
import { useCrossings, useDeleteCrossing } from '../../api/hooks';
import { useAuthStore } from '../../store/authStore';
import CrossingForm from '../CrossingForm/CrossingForm';

interface Props { slacklineId: number; }

export default function CrossingsTab({ slacklineId }: Props) {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { data, isLoading } = useCrossings(slacklineId, { page, page_size: 20 });
  const user = useAuthStore((s) => s.user);
  const deleteMutation = useDeleteCrossing(slacklineId);

  const handleDelete = async (crossingId: number) => {
    if (!confirm('Delete this crossing?')) return;
    setDeletingId(crossingId);
    try {
      await deleteMutation.mutateAsync(crossingId);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) return <div className="p-4 text-gray-500">Loading crossings...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Crossings ({data?.total ?? 0})</h3>
        {user && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            + Add Crossing
          </button>
        )}
      </div>
      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <CrossingForm slacklineId={slacklineId} onClose={() => setShowForm(false)} showImageUpload={false} />
        </div>
      )}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Style</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data?.items.map((c) => {
            const canDelete = user && (user.id === c.user?.id || user.is_admin);
            return (
              <tr key={c.id}>
                <td className="px-4 py-3 text-sm">{c.date ?? '—'}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    {c.user?.avatar_url && <img src={c.user.avatar_url} alt="" className="w-6 h-6 rounded-full" />}
                    {c.user?.username ?? '—'}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{c.style ?? '—'}</td>
                <td className="px-4 py-3 text-sm">{c.rating ? '★'.repeat(c.rating) : '—'}</td>
                <td className="px-4 py-3 text-sm max-w-xs truncate">{c.accent_description ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-right">
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      title="Delete crossing"
                      className="text-gray-400 hover:text-red-600 disabled:opacity-40 transition-colors"
                    >
                      {deletingId === c.id ? (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                      )}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {(!data?.items.length) && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No crossings yet</td></tr>
          )}
        </tbody>
      </table>
      {data && data.pages > 1 && (
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
