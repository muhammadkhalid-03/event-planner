/// <reference path="../types/google-maps.d.ts" />
/// <reference types="google.maps" />
"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsService,
  DirectionsRenderer,
  InfoWindow,
  StreetViewPanorama,
} from "@react-google-maps/api";

import { useApiIsLoaded } from "@vis.gl/react-google-maps";
import { useRouteStore } from "../stores/routeStore";
import RouteSelector from "./RouteSelector";
import { useMapRefStore } from "../stores/mapRefStore";
import { Waypoint } from "../types/businesses";

const polylineOptions = {
  strokeColor: "#4285F4",
  strokeOpacity: 0.8,
  strokeWeight: 4,
};

export default function MapView() {
  const apiIsLoaded = useApiIsLoaded();
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [streetViewVisible, setStreetViewVisible] = useState(false);
  const [directionsRequested, setDirectionsRequested] = useState(false);

  const { sourceLocation, waypoints, selectedLocation, setSelectedLocation } =
    useRouteStore();
  const { mapRef, setMapRef } = useMapRefStore();

  const directionsCallback = useCallback((response: any) => {
    if (response !== null && response.status === "OK") {
      setDirectionsResponse(response);
    } else {
      console.error("Directions request failed:", response);
    }
  }, []);

  const handleMarkerClick = useCallback(
    (waypoint: Waypoint) => {
      setSelectedLocation(waypoint.location);
      setStreetViewVisible(false);

      if (mapRef) {
        mapRef.panTo(waypoint.location.geometry.location);
        mapRef.setZoom(16);
      }
    },
    [mapRef, setSelectedLocation]
  );

  const mapLoadedRef = useRef(false);

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      setMapRef(map);

      // Only fit bounds once, on initial load
      if (!mapLoadedRef.current) {
        mapLoadedRef.current = true;

        if (waypoints && waypoints.length > 0) {
          const bounds = new window.google.maps.LatLngBounds();
          if (sourceLocation) {
            bounds.extend(sourceLocation);
          }
          waypoints.forEach((wp) =>
            bounds.extend(wp.location.geometry.location)
          );
          map.fitBounds(bounds);
        }
      }
    },
    [setMapRef]
  ); // Keep dependencies minimal

  useEffect(() => {
    if (
      sourceLocation &&
      waypoints &&
      waypoints.length > 0 &&
      !directionsRequested &&
      !directionsResponse
    ) {
      setDirectionsRequested(true);
    }
  }, [sourceLocation, waypoints, directionsRequested, directionsResponse]);

  return (
    <>
      {apiIsLoaded && (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          onLoad={handleMapLoad}
          options={{
            gestureHandling: "greedy",
            zoomControl: false,
            mapTypeControl: false,
            streetViewControl: true,
            fullscreenControl: true,
          }}
        >
          {!directionsResponse &&
            directionsRequested &&
            sourceLocation &&
            waypoints &&
            waypoints.length > 0 && (
              <DirectionsService
                options={{
                  origin: sourceLocation,
                  destination:
                    waypoints[waypoints.length - 1].location.geometry.location,
                  travelMode: google.maps.TravelMode.DRIVING,
                  waypoints: waypoints.slice(0, -1).map((wp) => ({
                    location: wp.location.geometry.location,
                    stopover: true,
                  })),
                  optimizeWaypoints: true,
                }}
                callback={directionsCallback}
              />
            )}
          {directionsResponse && (
            <DirectionsRenderer
              options={{
                directions: directionsResponse,
                polylineOptions,
                suppressMarkers: true,
                preserveViewport: true,
              }}
            />
          )}
          {waypoints.map((waypoint, index) => (
            <Marker
              key={`waypoint-${index}`}
              position={waypoint.location.geometry.location}
              onClick={() => handleMarkerClick(waypoint)}
            />
          ))}
          {selectedLocation && (
            <InfoWindow position={selectedLocation.geometry.location}>
              <div>
                <button onClick={() => setStreetViewVisible(true)}>
                  Enter Street View
                </button>
              </div>
            </InfoWindow>
          )}
          {streetViewVisible && selectedLocation && (
            <StreetViewPanorama
              options={{
                position: selectedLocation.geometry.location,
                pov: { heading: 165, pitch: 0 },
                visible: true,
                zoom: 1,
              }}
            />
          )}
        </GoogleMap>
      )}
      {!apiIsLoaded && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <p className="text-gray-700">
              {!apiIsLoaded
                ? "Loading Google Maps..."
                : "Loading street view..."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
