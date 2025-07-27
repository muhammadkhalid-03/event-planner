"use client";

import { useEffect, useState } from "react";
import LocationForm from "./components/LocationForm";
import MapView from "./components/MapView";
import Link from "next/link";
import { usePlacesStore } from "./stores/placesStore";
import { useApiIsLoaded } from "@vis.gl/react-google-maps";
import RouteCarousel from "./components/RouteCarousel";
import RouteEditor from "./components/RouteEditor";

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
    selectedPlaceTypes?: string[];
  };
  routeNumber?: number;
  routeName?: string;
  allRoutes?: Array<{
    startingLocation: LocationData;
    hourRange: number;
    numberOfPeople: number;
    radius: number;
    eventDescription: string;
    eventDate?: string;
    startTime?: string;
    endTime?: string;
    suggestedPlan: string;
    plannedLocations: Array<{
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
    placesFound: number;
    routeNumber: number;
    routeName: string;
    metadata: {
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
      filterStrategy: number;
      selectedPlaceTypes?: string[];
    };
  }>;
}

export default function Home() {
  const apiIsLoaded = useApiIsLoaded();
  const { locations, drawerOpen, setDrawerOpen, setLocations } =
    usePlacesStore();
  const [eventPlanData, setEventPlanData] = useState<EventPlanData | null>(
    null,
  );
  useEffect(() => {
    if (locations.length > 0) {
      setDrawerOpen(true);
    }
  }, [locations]);
  const [routes, setRoutes] = useState<EventPlanData[]>([]);
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);

  const handleEventPlanSubmit = (data: EventPlanData) => {
    // If we have multiple routes from the new API, replace the carousel
    if (data.allRoutes && data.allRoutes.length > 0) {
      // Convert the route data to the expected format
      const newRoutes = data.allRoutes.map((route, index) => ({
        startingLocation: data.startingLocation,
        hourRange: data.hourRange,
        numberOfPeople: data.numberOfPeople,
        radius: data.radius,
        eventDescription: data.eventDescription,
        eventDate: data.eventDate,
        startTime: data.startTime,
        endTime: data.endTime,
        suggestedPlan: route.suggestedPlan,
        plannedLocations: route.plannedLocations,
        placesFound: route.placesFound,
        metadata: route.metadata,
        routeNumber: route.routeNumber,
        routeName: route.routeName,
      }));

      setRoutes(newRoutes); // REPLACE instead of append
      setCurrentRouteIndex(0); // Always start at the first new route
      setEventPlanData(newRoutes[0]); // Set the first route as current

      console.log(
        `📍 Replaced with ${newRoutes.length} new route options in carousel.`,
      );
    } else {
      // Fallback to single route behavior
      setRoutes([data]);
      setCurrentRouteIndex(0);
      setEventPlanData(data);
    }

    if (data.plannedLocations && data.plannedLocations.length > 0) {
      console.log(
        `📍 Displaying ${data.plannedLocations.length} planned locations on map`,
      );
    }

    if (data.placesFound) {
      console.log(`🔍 Found ${data.placesFound} total places in the area`);
    }
  };

  const handleRouteChange = (index: number) => {
    setCurrentRouteIndex(index);
    setEventPlanData(routes[index]);
    // Update map with new route locations
    const plannedLocations =
      routes[index].plannedLocations?.map((location) => ({
        id: location.id,
        name: location.name,
        location: location.location,
        tags: location.tags || [],
        type: location.type,
        formatted_address: location.address,
        rating: location.rating,
        user_rating_total: location.user_rating_total,
        price_level: location.price_level,
        order: location.order || 0,
      })) || [];
    setLocations(plannedLocations);
  };

  const handleRouteLocationsChange = (newLocations: any[]) => {
    // Update the current route with the new locations
    const updatedRoutes = [...routes];
    updatedRoutes[currentRouteIndex] = {
      ...updatedRoutes[currentRouteIndex],
      plannedLocations: newLocations,
    };
    setRoutes(updatedRoutes);

    // Update the map with the new locations
    const plannedLocations = newLocations.map((location) => ({
      id: location.id,
      name: location.name,
      location: location.location,
      tags: location.tags || [],
      type: location.type,
      formatted_address: location.formatted_address,
      rating: location.rating,
      user_rating_total: location.user_rating_total,
      price_level: location.price_level,
      order: location.order || 0,
    }));
    setLocations(plannedLocations);
  };

  const handleRegeneratePoint = async (index: number) => {
    if (!routes[currentRouteIndex]) return;

    const currentRoute = routes[currentRouteIndex];
    const currentLocation = currentRoute.plannedLocations?.[index];

    if (!currentLocation) return;

    try {
      // Call API to regenerate a single point
      const response = await fetch("/api/regenerate-point", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentLocation,
          allCurrentLocations: currentRoute.plannedLocations || [],
          eventDescription: currentRoute.eventDescription,
          startingLocation: currentRoute.startingLocation,
          radius: currentRoute.radius,
          index,
          selectedPlaceTypes: currentRoute.metadata?.selectedPlaceTypes || [
            "restaurant",
            "park",
            "night_club",
          ],
        }),
      });

      const result = await response.json();

      if (result.success && result.newLocation) {
        // Update the specific location in the route
        const updatedLocations = [...(currentRoute.plannedLocations || [])];
        updatedLocations[index] = result.newLocation;

        handleRouteLocationsChange(updatedLocations);
      }
    } catch (error) {
      console.error("Error regenerating point:", error);
    }
  };

  const handleAddPoint = async () => {
    if (!routes[currentRouteIndex]) return;

    const currentRoute = routes[currentRouteIndex];

    try {
      // Call API to add a new point
      const response = await fetch("/api/add-point", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentLocations: currentRoute.plannedLocations,
          eventDescription: currentRoute.eventDescription,
          startingLocation: currentRoute.startingLocation,
          radius: currentRoute.radius,
          selectedPlaceTypes: currentRoute.metadata?.selectedPlaceTypes || [
            "restaurant",
            "park",
            "night_club",
          ],
        }),
      });

      const result = await response.json();

      if (result.success && result.newLocation) {
        // Add the new location to the route
        const updatedLocations = [
          ...(currentRoute.plannedLocations || []),
          result.newLocation,
        ];

        handleRouteLocationsChange(updatedLocations);
      }
    } catch (error) {
      console.error("Error adding point:", error);
    }
  };

  // Convert planned locations to the format expected by RouteEditor
  const currentRouteLocations =
    routes[currentRouteIndex]?.plannedLocations?.map((location) => ({
      id: location.id,
      name: location.name,
      location: location.location,
      tags: location.tags || [],
      type: location.type,
      formatted_address: location.address,
      rating: location.rating,
      user_rating_total: location.user_rating_total,
      price_level: location.price_level,
      order: location.order || 0,
    })) || [];
  return (
    <main className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex-1 relative">
        <MapView />

        {/* Compact Route Editor */}
        {currentRouteLocations.length > 0 && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-3xl px-2">
            <div className="text-xs">
              {" "}
              {/* Global text size reduction */}
              <RouteEditor
                locations={currentRouteLocations}
                onLocationsChange={handleRouteLocationsChange}
                onRegeneratePoint={handleRegeneratePoint}
                onAddPoint={handleAddPoint}
                compact={true} // Pass compact prop to RouteEditor
              />
            </div>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center space-y-3 pb-4">
          {/* Route Carousel with padding */}
          {routes.length > 0 && (
            <div className="w-full max-w-4xl px-2 mb-4">
              {" "}
              {/* Added bottom margin */}
              <RouteCarousel
                routes={routes}
                currentIndex={currentRouteIndex}
                onSelect={handleRouteChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 border-l border-gray-200 bg-white shadow-lg flex flex-col max-h-screen">
        <div className="p-4 pb-0 flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-900">Activity Planner</h1>
          <p className="text-sm text-gray-600 mt-1">
            Plan your perfect event with AI assistance
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {apiIsLoaded && <LocationForm onSubmit={handleEventPlanSubmit} />}
        </div>
      </div>
    </main>
  );
}
