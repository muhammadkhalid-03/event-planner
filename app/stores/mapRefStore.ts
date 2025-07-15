import { create } from "zustand";

interface MapRefStore {
  mapRef: google.maps.Map | null;
  setMapRef: (mapRef: google.maps.Map | null) => void;
}

export const useMapRefStore = create<MapRefStore>((set) => ({
  mapRef: null,
  setMapRef: (mapRef) => set({ mapRef }),
}));
