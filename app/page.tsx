"use client";

import { useState } from "react";
import LocationForm from "./components/LocationForm";
import MapView from "./components/MapView";
import { useGoogleMaps } from "./contexts/GoogleMapsContext";
import Link from "next/link";
import { LatLng } from "./types/businesses";

export default function Home() {
  const { isLoaded } = useGoogleMaps();
  const [sourceLocation, setSourceLocation] = useState<LatLng | null>(null);

  const handleLocationSubmit = (sourceData: LatLng | null) => {
    setSourceLocation(sourceData);
    console.log("📍 Source Location: ", sourceData);
  };

  return (
    <main className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex-1 relative">
        <MapView sourceData={sourceLocation} />
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
            <Link
              href="/places"
              className="mt-4 inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              PLACES API
            </Link>
          </div>
          {isLoaded && <LocationForm onSubmit={handleLocationSubmit} />}
        </div>
      </div>
    </main>
  );
}
