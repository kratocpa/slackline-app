import { create } from 'zustand';
interface FilterState {
  search: string;
  state: string;
  region: string;
  sector: string;
  minRating: number | null;
  setFilter: (key: string, value: any) => void;
  reset: () => void;
}
const initial = { search: '', state: '', region: '', sector: '', minRating: null };
export const useFilterStore = create<FilterState>((set) => ({
  ...initial,
  setFilter: (key, value) => set((prev) => {
    // cascade: changing state resets region+sector; changing region resets sector
    if (key === 'state')  return { ...prev, state: value, region: '', sector: '' };
    if (key === 'region') return { ...prev, region: value, sector: '' };
    return { ...prev, [key]: value };
  }),
  reset: () => set(initial),
}));
