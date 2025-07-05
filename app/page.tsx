"use client";

import { useEffect, useState } from "react";
import LocationForm from "./components/LocationForm";
import MapView from "./components/MapView";
import Link from "next/link";
import { LatLng } from "./types/businesses";
import { useApiIsLoaded } from "@vis.gl/react-google-maps";
import { useRouteStore } from "./stores/routeStore";
import RouteSelector from "./components/RouteSelector";

export default function Home() {
  const apiIsLoaded = useApiIsLoaded();
  const { waypoints, drawerOpen, setDrawerOpen } = useRouteStore();

  useEffect(() => {
    if (waypoints.length > 0) {
      setDrawerOpen(true);
    }
  }, [waypoints]);

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
              Enter your location to view the street view
            </p>
            <Link
              href="/places"
              className="mt-4 inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              PLACES API
            </Link>
          </div>
          {apiIsLoaded && <LocationForm />}
        </div>
      </div>
    </main>
  );
}
