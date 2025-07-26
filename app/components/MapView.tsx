// / <reference path="../types/google-maps.d.ts" />
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
  OverlayView,
} from "@react-google-maps/api";

import { useApiIsLoaded } from "@vis.gl/react-google-maps";
import { PlannedLocation, usePlacesStore } from "../stores/placesStore";
import { useMapRefStore } from "../stores/mapRefStore";
import { Badge } from "../../components/ui/badge";

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
          // if (sourceLocation) {
          //   bounds.extend(sourceLocation);
          // }
          locations.forEach((l) => bounds.extend(l.location));
          map.fitBounds(bounds);
        }
      }
    },
    [setMapRef]
  ); // Keep dependencies minimal

  // Reset directions when locations change
  useEffect(() => {
    setDirectionsRequested(false);
    setDirectionsResponse(null);
  }, [locations]);

  // Existing effect to trigger directions request
  useEffect(() => {
    if (
      // sourceLocation &&
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
            startingLocation && ( // <-- Make sure startingLocation exists
              <DirectionsService
                options={{
                  origin: startingLocation, // <-- Use the actual starting location
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
              >
                {selectedLocation &&
                  selectedLocation.location.lat === location.location.lat &&
                  selectedLocation.location.lng === location.location.lng && (
                    <InfoWindow
                      position={location.location}
                      onCloseClick={() => setSelectedLocation(null)}
                    >
                      <div className="flex flex-col items-start gap-2 min-w-[180px]">
                        {/* Order badge and name */}
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-600 text-white rounded-full px-2 py-1 shadow-lg">
                            {index + 1}
                          </Badge>
                          <span className="font-semibold text-base">
                            {location.name || "Location"}
                          </span>
                        </div>
                        {/* Tags (if any) */}
                        <div className="flex flex-wrap gap-1">
                          {location.tags?.slice(0, 2).map((tag: string) => (
                            <Badge variant="secondary" key={tag}>
                              {tag[0].toUpperCase() +
                                tag.slice(1).replace(/_/g, " ")}
                            </Badge>
                          ))}
                          {location.tags?.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{location.tags.length - 2} more
                            </span>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex gap-2 mt-1">
                          <button
                            className="bg-muted text-primary rounded px-2 py-1 text-xs"
                            onClick={() => setStreetViewVisible(true)}
                          >
                            Street View
                          </button>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
              </Marker>
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
