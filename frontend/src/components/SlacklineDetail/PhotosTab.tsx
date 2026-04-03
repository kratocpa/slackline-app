import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCrossings } from '../../api/hooks';
import { useAuthStore } from '../../store/authStore';
import CrossingForm from '../CrossingForm/CrossingForm';
import type { CrossingItem } from '../../types';

interface Props { slacklineId: number; }

function Lightbox({ photos, index, onClose, onPrev, onNext }: {
  photos: CrossingItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const photo = photos[index];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close */}
      <button onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      {/* Prev */}
      {index > 0 && (
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" /></svg>
        </button>
      )}

      {/* Image + caption */}
      <div className="max-w-4xl max-h-[85vh] mx-16 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <img
          src={photo.image_url!}
          alt={`Crossing by ${photo.user?.username ?? 'unknown'}`}
          className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl"
        />
        <div className="mt-3 text-center text-white/90">
          <div className="flex items-center justify-center gap-3 text-sm">
            {photo.user?.avatar_url && (
              <img src={photo.user.avatar_url} alt="" className="w-7 h-7 rounded-full border border-white/30" />
            )}
            <span className="font-medium">{photo.user?.username ?? 'Unknown'}</span>
            {photo.date && <span className="text-white/60">· {photo.date}</span>}
            {photo.style && <span className="text-white/60">· {photo.style}</span>}
            {photo.rating && <span className="text-yellow-400">· {'★'.repeat(photo.rating)}</span>}
          </div>
          {photo.accent_description && (
            <p className="mt-1 text-sm text-white/70 max-w-lg">{photo.accent_description}</p>
          )}
          <p className="mt-2 text-xs text-white/40">{index + 1} / {photos.length} &nbsp;·&nbsp; ← → to navigate &nbsp;·&nbsp; Esc to close</p>
        </div>
      </div>

      {/* Next */}
      {index < photos.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" /></svg>
        </button>
      )}
    </div>,
    document.body
  );
}

export default function PhotosTab({ slacklineId }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const user = useAuthStore((s) => s.user);

  // Fetch all crossings (large page) to collect every photo
  const { data, isLoading, isError, refetch } = useCrossings(slacklineId, { page: 1, page_size: 500 });
  const photos = (data?.items ?? []).filter((c) => !!c.image_url);

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading photos...</div>;
  if (isError)   return <div className="p-8 text-center text-red-500">Failed to load photos.</div>;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Photos
          <span className="ml-2 text-sm font-normal text-gray-400">({photos.length})</span>
        </h3>
        {user && (
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
            {showForm ? 'Cancel' : '+ Add Crossing with Photo'}
          </button>
        )}
      </div>

      {/* Crossing form inline */}
      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <CrossingForm slacklineId={slacklineId} onClose={() => { setShowForm(false); refetch(); }} />
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && (
        <div className="py-16 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 mx-auto text-gray-300 mb-3" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 12a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zM3 8.25A5.25 5.25 0 018.25 3h7.5A5.25 5.25 0 0121 8.25v7.5A5.25 5.25 0 0115.75 21h-7.5A5.25 5.25 0 013 15.75v-7.5z" />
          </svg>
          <p className="text-gray-400 text-sm">No photos yet.</p>
          {user && <p className="text-gray-400 text-sm mt-1">Add a crossing with a photo to get started.</p>}
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {photos.map((photo, i) => (
            <button key={photo.id} onClick={() => setLightboxIndex(i)}
              className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 hover:ring-2 hover:ring-blue-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500">
              <img
                src={photo.image_url!}
                alt={`Crossing by ${photo.user?.username ?? 'unknown'}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end p-2">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity w-full">
                  <p className="text-white text-xs font-medium truncate">{photo.user?.username ?? '—'}</p>
                  {photo.date && <p className="text-white/70 text-xs">{photo.date}</p>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => Math.max(0, (i ?? 1) - 1))}
          onNext={() => setLightboxIndex((i) => Math.min(photos.length - 1, (i ?? 0) + 1))}
        />
      )}
    </div>
  );
}

