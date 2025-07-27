"use client";

import { useEffect, useState } from "react";
import LocationForm from "./components/LocationForm";
import MapView from "./components/MapView";
import Link from "next/link";
import { usePlacesStore } from "./stores/placesStore";
import { useApiIsLoaded } from "@vis.gl/react-google-maps";
import RouteCarousel from "./components/RouteCarousel";
import PlanSlider from "./components/PlanSlider";

interface LocationData {
  country: string;
  city: string;
  location: { lat: number; lng: number };
}

interface EventPlanData {
  startingLocation: LocationData;
  hourRange: number;
  numberOfPeople: number;
  radius: number;
  eventDescription: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  suggestedPlan: string;
  plannedLocations?: Array<{
    id: string;
    name: string;
    location: { lat: number; lng: number };
    type: string;
    address?: string;
    rating?: number;
    order?: number;
    tags?: string[];
    user_rating_total?: number;
    price_level?: number;
  }>;
  placesFound?: number;
  metadata?: {
    timestamp: number;
    searchLocation: { lat: number; lng: number };
    radius: number;
    eventParameters: {
      hourRange: number;
      numberOfPeople: number;
      eventDescription: string;
      eventDate?: string;
      startTime?: string;
      endTime?: string;
      ageRange?: [number, number];
      budget?: number;
    };
  };
  routeNumber?: number;
  routeName?: string;
  allRoutes?: Array<EventPlanData>;
}

export default function Home() {
  const apiIsLoaded = useApiIsLoaded();
  const { locations, setLocations } = usePlacesStore();

  const [routes, setRoutes] = useState<EventPlanData[]>([]);
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);

  // Handle new event plan
  const handleEventPlanSubmit = (data: EventPlanData) => {
    if (data.allRoutes && data.allRoutes.length > 0) {
      const newRoutes = data.allRoutes.map((route, index) => ({
        ...route,
        routeNumber: route.routeNumber ?? index + 1,
        routeName: route.routeName ?? `Route ${index + 1}`,
      }));

      setRoutes((prev) => [...prev, ...newRoutes]);
      setCurrentRouteIndex(routes.length);
      setCurrentLocationIndex(0);
    } else {
      setRoutes((prev) => [...prev, data]);
      setCurrentRouteIndex(routes.length);
      setCurrentLocationIndex(0);
    }

    if (data.plannedLocations) setLocations(data.plannedLocations);
  };

  // Switch between different routes (plans)
  const handleRouteChange = (index: number) => {
    setCurrentRouteIndex(index);
    setCurrentLocationIndex(0);
    const plannedLocations = routes[index].plannedLocations || [];
    setLocations(plannedLocations);
  };

  const handleDeleteLocation = (id: string) => {
    setRoutes((prev) => {
      const updated = [...prev];
      const current = updated[currentRouteIndex];
      if (current?.plannedLocations) {
        current.plannedLocations = current.plannedLocations.filter((loc) => loc.id !== id);
      }
      return updated;
    });
    setCurrentLocationIndex(0);
  };

  const handleRegenerateLocation = async (id: string) => {
    const currentRoute = routes[currentRouteIndex];
    if (!currentRoute || !currentRoute.plannedLocations) return;

    const currentLoc = currentRoute.plannedLocations.find((loc) => loc.id === id);
    if (!currentLoc) return;

    try {
      const res = await fetch("/api/regenerate-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentLocation: currentLoc,
          routeLocations: currentRoute.plannedLocations,
          metadata: currentRoute.metadata,
        }),
      });

      if (!res.ok) {
        console.error("Regenerate API error:", await res.text());
        return;
      }

      const updatedLoc = await res.json();

      setRoutes((prev) => {
        const updated = [...prev];
        const current = updated[currentRouteIndex];
        if (current?.plannedLocations) {
          current.plannedLocations = current.plannedLocations.map((loc) =>
              loc.id === id ? updatedLoc : loc
          );
        }
        return updated;
      });
    } catch (err) {
      console.error("Failed to regenerate location", err);
    }
  };


  const currentPlannedLocations = routes[currentRouteIndex]?.plannedLocations || [];

  return (
      <main className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex-1 relative">
          <MapView />

          {/* Route Carousel */}
          {routes.length > 0 && (
              <div className="absolute bottom-32 left-0 right-0 z-20">
                <RouteCarousel
                    routes={routes}
                    currentIndex={currentRouteIndex}
                    onSelect={handleRouteChange}
                />
              </div>
          )}

          {/* Event Slider for locations */}
          {currentPlannedLocations.length > 0 && (
              <div className="absolute bottom-4 left-0 right-0 z-20">
                <PlanSlider
                    locations={currentPlannedLocations}
                    currentIndex={currentLocationIndex}
                    onSelect={setCurrentLocationIndex}
                    onDelete={handleDeleteLocation}
                    onEdit={handleRegenerateLocation}
                />
              </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-96 border-l border-gray-200 bg-white shadow-lg">
          <div className="h-full p-6">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Activity Planner
              </h1>
              <p className="text-gray-600">
                Plan your perfect event with AI assistance
              </p>
              <Link
                  href="/places"
                  className="mt-4 inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                PLACES API
              </Link>
            </div>
            {apiIsLoaded && <LocationForm onSubmit={handleEventPlanSubmit} />}
          </div>
        </div>
      </main>
  );
}
