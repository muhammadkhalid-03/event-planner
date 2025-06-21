"use client";

import { useState } from "react";
import LocationForm from "./components/LocationForm";
import MapView from "./components/MapView";
import { useGoogleMaps } from "./contexts/GoogleMapsContext";
import Link from "next/link";

interface LocationData {
  country: string;
  city: string;
  location: { lat: number; lng: number };
}

export default function Home() {
  const { isLoaded } = useGoogleMaps();
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    null
  );
  const [sourceLocation, setSourceLocation] = useState<LocationData | null>(
    null
  );
  const [destinationLocation, setDestinationLocation] =
    useState<LocationData | null>(null);

  const handleLocationSubmit = (data: {
    locationData: LocationData;
    sourceData: LocationData;
    destinationData: LocationData;
  }) => {
    setSelectedLocation(data.locationData);
    setSourceLocation(data.sourceData);
    setDestinationLocation(data.destinationData);
    console.log("All locations:", data);
  };

  return (
    <main className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex-1 relative">
        <MapView
          locationData={selectedLocation}
          sourceData={sourceLocation}
          destinationData={destinationLocation}
        />
      </div>
      <div className="w-96 border-l border-gray-200 bg-white shadow-lg">
        <div className="h-full p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Activity Planner
            </h1>
            <p className="text-gray-600">
              Enter your location to view the street view
            </p>
            <Link href="/places" className="mt-4 inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                PLACES API
            </Link>
          </div>
          {isLoaded && <LocationForm onSubmit={handleLocationSubmit} />}
        </div>
      </div>
    </main>
  );
}
