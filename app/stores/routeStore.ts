import { create } from "zustand";
import { LatLng, Waypoint } from "../types/businesses";

interface RouteStore {
  sourceLocation: LatLng | null;
  waypoints: Waypoint[];
  selectedLocation: LatLng | null;
  setSourceLocation: (location: LatLng | null) => void;
  setWaypoints: (waypoints: Waypoint[]) => void;
  setSelectedLocation: (location: LatLng | null) => void;
}

export const useRouteStore = create<RouteStore>((set) => ({
  sourceLocation: null,
  waypoints: [],
  selectedLocation: null,
  setSourceLocation: (location) => set({ sourceLocation: location }),
  setWaypoints: (waypoints) => set({ waypoints }),
  setSelectedLocation: (location) => set({ selectedLocation: location }),
  clearRoute: () =>
    set({ selectedLocation: null, waypoints: [], sourceLocation: null }),
}));
