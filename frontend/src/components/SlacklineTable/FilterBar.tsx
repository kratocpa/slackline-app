import { useFilterStore } from '../../store/filterStore';
import { useFilterOptions } from '../../api/hooks';

export default function FilterBar() {
  const { search, state, region, sector, minRating, setFilter, reset } = useFilterStore();
  const { data } = useFilterOptions(state || undefined, region || undefined);

  const states  = data?.states  ?? [];
  const regions = data?.regions ?? [];
  const sectors = data?.sectors ?? [];

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg">
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setFilter('search', e.target.value)}
        className="px-3 py-2 border rounded-lg text-sm w-48"
      />

      {/* State */}
      <select
        value={state}
        onChange={(e) => setFilter('state', e.target.value)}
        className="px-3 py-2 border rounded-lg text-sm"
      >
        <option value="">All states</option>
        {states.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Region — enabled only when a state is chosen */}
      <select
        value={region}
        onChange={(e) => setFilter('region', e.target.value)}
        disabled={!state || regions.length === 0}
        className="px-3 py-2 border rounded-lg text-sm disabled:opacity-40"
      >
        <option value="">All regions</option>
        {regions.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>

      {/* Sector — enabled only when a region is chosen */}
      <select
        value={sector}
        onChange={(e) => setFilter('sector', e.target.value)}
        disabled={!region || sectors.length === 0}
        className="px-3 py-2 border rounded-lg text-sm disabled:opacity-40"
      >
        <option value="">All sectors</option>
        {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <select
        value={minRating ?? ''}
        onChange={(e) => setFilter('minRating', e.target.value ? Number(e.target.value) : null)}
        className="px-3 py-2 border rounded-lg text-sm"
      >
        <option value="">Min Rating</option>
        {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>★ {r}+</option>)}
      </select>

      <button onClick={reset} className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800">
        Reset
      </button>
    </div>
  );
}
