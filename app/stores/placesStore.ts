import { create } from "zustand";

// Type for a location object returned by extractLocationsFromPlan
export interface PlannedLocation {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  tags: string[];
  type: string;
  formatted_address?: string;
  rating?: number;
  user_rating_total?: number;
  price_level?: number;
  order: number;
}

interface PlacesStoreState {
  locations: PlannedLocation[];
  setLocations: (locations: PlannedLocation[]) => void;
}

// interface Business {
//   id: string;
//   name: string;
//   location: { lat: number; lng: number };
//   types: string[];
//   formatted_address: string;
//   rating: number;
//   user_rating_total: number;
//   price_level: number;
// }

interface PlacesStore {
  locations: PlannedLocation[];
  setLocations: (locations: Array<{
      id: string;
      name: string;
      location: { lat: number; lng: number };
      type: string;
      address?: string;
      rating?: number;
      order?: number;
      tags?: string[];
      user_rating_total?: number;
      price_level?: number
  }>) => void;
  plannedLocations: PlannedLocation[];
  setPlannedLocations: (locations: PlannedLocation[]) => void;
  selectedLocation: PlannedLocation | null;
  setSelectedLocation: (location: PlannedLocation | null) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  startingLocation: { lat: number; lng: number } | null;
  setStartingLocation: (location: { lat: number; lng: number } | null) => void;
}

export const usePlacesStore = create<PlacesStore>((set) => ({
  locations: [],
  setLocations: (locations) => set({ locations }),
  plannedLocations: [],
  setPlannedLocations: (plannedLocations) => set({ plannedLocations }),
  selectedLocation: null,
  setSelectedLocation: (location) => set({ selectedLocation: location }),
  drawerOpen: false,
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  startingLocation: null,
  setStartingLocation: (location) => set({ startingLocation: location }),
}));
