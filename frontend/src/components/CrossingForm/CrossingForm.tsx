import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useCreateCrossing } from '../../api/hooks';

interface Props {
  slacklineId: number;
  onClose: () => void;
  showImageUpload?: boolean;
}

const STYLES = ['OS (on sight)', 'AF (after fall)', 'OW (one way)', 'Flash', 'Redpoint', ''];

export default function CrossingForm({ slacklineId, onClose, showImageUpload = true }: Props) {
  const [date, setDate] = useState('');
  const [style, setStyle] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const mutation = useCreateCrossing(slacklineId);
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) setFile(accepted[0]);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: 1,
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    if (date) fd.append('date', date);
    if (style) fd.append('style', style);
    if (notes) fd.append('accent_description', notes);
    if (rating) fd.append('rating', String(rating));
    if (file) fd.append('image', file);
    await mutation.mutateAsync(fd);
    onClose();
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h4 className="font-semibold text-md">Add Crossing</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
          <select value={style} onChange={e => setStyle(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="">Select style...</option>
            {STYLES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5)</label>
          <select value={rating} onChange={e => setRating(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="">No rating</option>
            {[1,2,3,4,5].map(r => <option key={r} value={r}>{'\u2605'.repeat(r)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Describe your crossing..." />
      </div>
      {showImageUpload && (
        <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
          ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}>
          <input {...getInputProps()} />
          {file ? (
            <p className="text-sm text-green-600">Selected: {file.name}</p>
          ) : (
            <p className="text-sm text-gray-500">Drop an image here or click to select</p>
          )}
        </div>
      )}
      <div className="flex gap-3">
        <button type="submit" disabled={mutation.isPending}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50">
          {mutation.isPending ? 'Saving...' : 'Save Crossing'}
        </button>
        <button type="button" onClick={onClose}
          className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
      </div>
      {mutation.isError && (
        <p className="text-sm text-red-600">Error: {mutation.error.message}</p>
      )}
    </form>
  );
}
