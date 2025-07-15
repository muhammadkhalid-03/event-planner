import { create } from "zustand";

// Type for a location object returned by extractLocationsFromPlan
export interface Location {
  id: string;
  longitude: number;
  latitude: number;
}

interface PlacesStoreState {
  locations: Location[];
  setLocations: (locations: Location[]) => void;
}

export const usePlacesStore = create<PlacesStoreState>((set) => ({
  locations: [],
  setLocations: (locations) => set({ locations }),
}));
