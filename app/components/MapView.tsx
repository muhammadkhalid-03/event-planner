// / <reference path="../types/google-maps.d.ts" />
/// <reference types="google.maps" />
"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsService,
  DirectionsRenderer,
  StreetViewPanorama,
  OverlayView,
} from "@react-google-maps/api";

import { useApiIsLoaded } from "@vis.gl/react-google-maps";
import { PlannedLocation, usePlacesStore } from "../stores/placesStore";
import { useMapRefStore } from "../stores/mapRefStore";
import { Badge } from "../../components/ui/badge";
import InfoWindow from "./InfoWindow";

const polylineOptions = {
  strokeColor: "#4285F4",
  strokeOpacity: 0.8,
  strokeWeight: 4,
};

// Default location: New York City
const defaultMapCenter = { lat: 40.7128, lng: -74.006 };
const defaultZoom = 12;

export default function MapView() {
  const apiIsLoaded = useApiIsLoaded();
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [streetViewVisible, setStreetViewVisible] = useState(false);
  const [directionsRequested, setDirectionsRequested] = useState(false);

  const { selectedLocation, setSelectedLocation, locations, startingLocation } =
    usePlacesStore();
  const { mapRef, setMapRef } = useMapRefStore();

  const directionsCallback = useCallback((response: any) => {
    if (response !== null && response.status === "OK") {
      setDirectionsResponse(response);
    } else {
      console.error("Directions request failed:", response);
    }
  }, []);

  const handleMarkerClick = useCallback(
    (waypoint: PlannedLocation) => {
      setSelectedLocation(waypoint);
      setStreetViewVisible(false);

      if (mapRef) {
        // Instead of centering exactly on the marker, offset it slightly upward
        // so the InfoWindow is visible
        const offsetLat = waypoint.location.lat + 0.001; // Offset by ~200 meters north
        mapRef.panTo({ lat: offsetLat, lng: waypoint.location.lng });

        // Use a more reasonable zoom level (14 instead of 16)
        const currentZoom = mapRef.getZoom();
        if (!currentZoom || currentZoom < 14) {
          mapRef.setZoom(14);
        }
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

        if (locations && locations.length > 0) {
          const bounds = new window.google.maps.LatLngBounds();
          locations.forEach((l) => bounds.extend(l.location));
          map.fitBounds(bounds);
        }
      }
    },
    [setMapRef]
  );

  // Reset directions when locations change
  useEffect(() => {
    setDirectionsRequested(false);
    setDirectionsResponse(null);
  }, [locations]);

  // Reset street view when locations change (new route generated)
  useEffect(() => {
    setStreetViewVisible(false);
    setSelectedLocation(null); // Also clear selected location for clean state
  }, [locations, setSelectedLocation]);

  // Existing effect to trigger directions request
  useEffect(() => {
    if (
      locations &&
      locations.length > 0 &&
      !directionsRequested &&
      !directionsResponse
    ) {
      setDirectionsRequested(true);
    }
  }, [locations, directionsRequested, directionsResponse]);

  useEffect(() => {
    if (mapRef && locations && locations.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      locations.forEach((l) => bounds.extend(l.location));
      mapRef.fitBounds(bounds);
    }
  }, [mapRef, locations]);

  // Update map center when starting location changes
  useEffect(() => {
    if (mapRef && startingLocation) {
      mapRef.panTo(startingLocation);
      mapRef.setZoom(14);
    }
  }, [mapRef, startingLocation]);

  return (
    <>
      {apiIsLoaded && (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={defaultMapCenter}
          zoom={defaultZoom}
          onLoad={handleMapLoad}
          options={{
            gestureHandling: "greedy",
            zoomControl: false,
            mapTypeControl: false,
            streetViewControl: true,
            fullscreenControl: true,
          }}
        >
          {/* Starting location marker */}
          {startingLocation && (
            <Marker
              position={startingLocation}
              title="Starting Location"
              icon={{
                url:
                  "data:image/svg+xml;charset=UTF-8," +
                  encodeURIComponent(`
                  <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="18" fill="#10B981" stroke="white" stroke-width="4"/>
                    <circle cx="20" cy="20" r="8" fill="white"/>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(40, 40),
                anchor: new window.google.maps.Point(20, 20),
              }}
            />
          )}

          {!directionsResponse &&
            directionsRequested &&
            locations &&
            locations.length > 0 &&
            startingLocation && (
              <DirectionsService
                options={{
                  origin: startingLocation,
                  destination: locations[locations.length - 1].location,
                  waypoints: locations.slice(0, -1).map((wp) => ({
                    location: wp.location,
                    stopover: true,
                  })),
                  travelMode: google.maps.TravelMode.DRIVING,
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

          {locations.map((location, index) => (
            <div key={`waypoint-${index}`}>
              <Marker
                position={location.location}
                onClick={() => handleMarkerClick(location)}
              />

              {/* Number badge overlay */}
              <OverlayView
                position={location.location}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <Badge
                  className="bg-red-600 text-white rounded-full px-2 py-1 shadow-lg"
                  style={{
                    position: "absolute",
                    transform: "translate(-50%, -140%)",
                    pointerEvents: "none",
                  }}
                >
                  {index + 1}
                </Badge>
              </OverlayView>
            </div>
          ))}

          {/* InfoWindow Component */}
          {selectedLocation && (
            <InfoWindow
              location={selectedLocation}
              position={
                new google.maps.LatLng(
                  selectedLocation.location.lat,
                  selectedLocation.location.lng
                )
              }
              onClose={() => setSelectedLocation(null)}
              index={locations.findIndex(
                (loc) =>
                  loc.location.lat === selectedLocation.location.lat &&
                  loc.location.lng === selectedLocation.location.lng
              )}
              onStreetView={() => {
                setSelectedLocation(selectedLocation);
                setStreetViewVisible(true);
              }}
            />
          )}

          {streetViewVisible && selectedLocation && (
            <StreetViewPanorama
              options={{
                position: selectedLocation.location,
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
