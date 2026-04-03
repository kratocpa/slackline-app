import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useCreateSlackline, useUpdateSlackline } from '../../api/hooks';
import type { SlacklineDetail } from '../../types';

interface Props { initial?: SlacklineDetail; onClose: () => void; }

export default function SlacklineForm({ initial, onClose }: Props) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    state: initial?.state ?? '',
    region: initial?.region ?? '',
    sector: initial?.sector ?? '',
    length: initial?.length ?? '',
    height: initial?.height ?? '',
    author: initial?.author ?? '',
    name_history: initial?.name_history ?? '',
    time_approach: initial?.time_approach ?? '',
    time_tensioning: initial?.time_tensioning ?? '',
    rating: initial?.rating ?? '',
    date_tense: initial?.date_tense ?? '',
    restriction: initial?.restriction ?? '',
    type: initial?.type ?? '',
    anchor1_lat: initial?.first_anchor_point?.latitude ?? '',
    anchor1_lon: initial?.first_anchor_point?.longitude ?? '',
    anchor1_desc: initial?.first_anchor_point?.description ?? '',
    anchor2_lat: initial?.second_anchor_point?.latitude ?? '',
    anchor2_lon: initial?.second_anchor_point?.longitude ?? '',
    anchor2_desc: initial?.second_anchor_point?.description ?? '',
    parking_lat: initial?.parking_spot?.latitude ?? '',
    parking_lon: initial?.parking_spot?.longitude ?? '',
    parking_desc: initial?.parking_spot?.description ?? '',
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(initial?.cover_image_url ?? null);

  const createMut = useCreateSlackline();
  const updateMut = useUpdateSlackline(initial?.id ?? 0);
  const mutation = isEdit ? updateMut : createMut;

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setCoverFile(accepted[0]);
      setCoverPreview(URL.createObjectURL(accepted[0]));
    }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: 1,
  });

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: form.name,
      description: form.description || null,
      state: form.state || null,
      region: form.region || null,
      sector: form.sector || null,
      length: form.length ? Number(form.length) : null,
      height: form.height ? Number(form.height) : null,
      author: form.author || null,
      name_history: form.name_history || null,
      time_approach: form.time_approach || null,
      time_tensioning: form.time_tensioning || null,
      rating: form.rating ? Number(form.rating) : null,
      date_tense: form.date_tense || null,
      restriction: form.restriction || null,
      type: form.type || null,
    };
    if (form.anchor1_lat && form.anchor1_lon) {
      payload.first_anchor_point = {
        latitude: Number(form.anchor1_lat), longitude: Number(form.anchor1_lon),
        description: form.anchor1_desc || null,
      };
    }
    if (form.anchor2_lat && form.anchor2_lon) {
      payload.second_anchor_point = {
        latitude: Number(form.anchor2_lat), longitude: Number(form.anchor2_lon),
        description: form.anchor2_desc || null,
      };
    }
    if (form.parking_lat && form.parking_lon) {
      payload.parking_spot = {
        latitude: Number(form.parking_lat), longitude: Number(form.parking_lon),
        description: form.parking_desc || null,
      };
    }
    const fd = new FormData();
    fd.append('data', JSON.stringify(payload));
    if (coverFile) fd.append('cover_image', coverFile);
    await mutation.mutateAsync(fd);
    onClose();
  };

  const inputCls = "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">{isEdit ? 'Edit' : 'Create'} Slackline</h3>

      {/* Cover image */}
      <div>
        <label className={labelCls}>Cover Photo</label>
        <div className="flex gap-4 items-start">
          {coverPreview && (
            <div className="relative shrink-0">
              <img src={coverPreview} alt="Cover preview"
                className="w-32 h-20 object-cover rounded-lg border shadow-sm" />
              <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">✕</button>
            </div>
          )}
          <div {...getRootProps()} className={`flex-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'}`}>
            <input {...getInputProps()} />
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mx-auto text-gray-300 mb-1" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 12a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" />
            </svg>
            <p className="text-sm text-gray-500">{coverFile ? coverFile.name : 'Drop image or click to select'}</p>
          </div>
        </div>
      </div>

      {/* Basic fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className={labelCls}>Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} required /></div>
        <div><label className={labelCls}>Author</label>
          <input value={form.author} onChange={e => set('author', e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>State</label>
          <input value={form.state} onChange={e => set('state', e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Region</label>
          <input value={form.region} onChange={e => set('region', e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Sector</label>
          <input value={form.sector} onChange={e => set('sector', e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Length (m)</label>
          <input type="number" step="0.01" value={form.length} onChange={e => set('length', e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Height (m)</label>
          <input type="number" step="0.01" value={form.height} onChange={e => set('height', e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Rating</label>
          <select value={form.rating} onChange={e => set('rating', e.target.value)} className={inputCls}>
            <option value="">—</option>
            {[1,2,3,4,5].map(r => <option key={r} value={r}>{'★'.repeat(r)}</option>)}
          </select></div>
        <div><label className={labelCls}>Time Approach</label>
          <input value={form.time_approach} onChange={e => set('time_approach', e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Rigging Time</label>
          <input value={form.time_tensioning} onChange={e => set('time_tensioning', e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>First Rigged</label>
          <input type="date" value={form.date_tense} onChange={e => set('date_tense', e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls}>
            <option value="">—</option>
            {['highline', 'midline', 'waterline', 'longline'].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select></div>
      </div>

      <div><label className={labelCls}>Description</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={inputCls} /></div>
      <div><label className={labelCls}>Restriction</label>
        <textarea value={form.restriction} onChange={e => set('restriction', e.target.value)} rows={2} className={inputCls} placeholder="Any access restrictions or conditions…" /></div>
      <div><label className={labelCls}>Name History</label>
        <textarea value={form.name_history} onChange={e => set('name_history', e.target.value)} rows={2} className={inputCls} /></div>

      {/* Anchor points */}
      {[
        { label: 'Anchor Point 1', latKey: 'anchor1_lat', lonKey: 'anchor1_lon', descKey: 'anchor1_desc' },
        { label: 'Anchor Point 2', latKey: 'anchor2_lat', lonKey: 'anchor2_lon', descKey: 'anchor2_desc' },
        { label: 'Parking Spot',   latKey: 'parking_lat', lonKey: 'parking_lon', descKey: 'parking_desc' },
      ].map(({ label, latKey, lonKey, descKey }) => (
        <fieldset key={label} className="border border-gray-200 p-3 rounded-lg">
          <legend className="text-sm font-medium text-gray-600 px-2">{label}</legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
            <div><label className={labelCls}>Latitude</label>
              <input type="number" step="any" value={(form as any)[latKey]}
                onChange={e => set(latKey, e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Longitude</label>
              <input type="number" step="any" value={(form as any)[lonKey]}
                onChange={e => set(lonKey, e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Description</label>
              <input value={(form as any)[descKey]}
                onChange={e => set(descKey, e.target.value)} className={inputCls} /></div>
          </div>
        </fieldset>
      ))}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={mutation.isPending}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
          {mutation.isPending ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Slackline')}
        </button>
        <button type="button" onClick={onClose}
          className="px-5 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
      </div>
      {mutation.isError && (
        <p className="text-sm text-red-600">Error saving. Please try again.</p>
      )}
    </form>
  );
}
