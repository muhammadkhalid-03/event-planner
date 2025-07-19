"use client";

import { useEffect, useState } from "react";
import LocationForm from "./components/LocationForm";
import MapView from "./components/MapView";
import Link from "next/link";
import RouteSelector from "./components/RouteSelector";
import { usePlacesStore } from "./stores/placesStore";
import { useApiIsLoaded } from "@vis.gl/react-google-maps";

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
  suggestedPlan: string;
  plannedLocations?: Array<{
    id: string;
    name: string;
    location: { lat: number; lng: number };
    type: string;
    address?: string;
    rating?: number;
    order?: number;
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
    };
  };
}

export default function Home() {
  const apiIsLoaded = useApiIsLoaded();
  const { locations, drawerOpen, setDrawerOpen } = usePlacesStore();
  const [eventPlanData, setEventPlanData] = useState<EventPlanData | null>(
    null
  );
  useEffect(() => {
    if (locations.length > 0) {
      setDrawerOpen(true);
    }
  }, [locations]);

  const handleEventPlanSubmit = (data: EventPlanData) => {
    setEventPlanData(data);

    if (data.plannedLocations && data.plannedLocations.length > 0) {
      console.log(
        `📍 Displaying ${data.plannedLocations.length} planned locations on map`
      );
    }

    if (data.placesFound) {
      console.log(`🔍 Found ${data.placesFound} total places in the area`);
    }
  };

  return (
    <main className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex-1 relative">
        <MapView />
        <div className="absolute bottom-4 z-10">
          <RouteSelector open={drawerOpen} setOpen={setDrawerOpen} />
        </div>
      </div>
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
