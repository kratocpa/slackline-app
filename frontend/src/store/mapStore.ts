import { create } from 'zustand';
interface MapState {
  bounds: string | null;
  setBounds: (b: string | null) => void;
}
export const useMapStore = create<MapState>((set) => ({
  bounds: null,
  setBounds: (b) => set({ bounds: b }),
}));
