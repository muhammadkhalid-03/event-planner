import { create } from "zustand";
import { Business, LatLng, Waypoint } from "../types/businesses";

interface RouteStore {
  sourceLocation: LatLng | null;
  waypoints: Waypoint[];
  selectedLocation: Business | null;
  drawerOpen: boolean;
  setSourceLocation: (location: LatLng | null) => void;
  setWaypoints: (waypoints: Waypoint[]) => void;
  setSelectedLocation: (location: Business | null) => void;
  setDrawerOpen: (open: boolean) => void;
}

export const useRouteStore = create<RouteStore>((set) => ({
  sourceLocation: null,
  waypoints: [],
  selectedLocation: null,
  drawerOpen: false,
  setSourceLocation: (location) => set({ sourceLocation: location }),
  setWaypoints: (waypoints) => set({ waypoints }),
  setSelectedLocation: (location) => set({ selectedLocation: location }),
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  clearRoute: () =>
    set({ selectedLocation: null, waypoints: [], sourceLocation: null }),
}));
