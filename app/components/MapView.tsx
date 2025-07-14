/// <reference types="google.maps" />
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "../contexts/GoogleMapsContext";
import { LocationData } from "../types/location";
import { getRoute } from "../api/mapServices";
import {
  GoogleMap,
  Polyline,
  DirectionsService,
  DirectionsRenderer,
  InfoWindow,
  StreetViewPanorama,
} from "@react-google-maps/api";

interface MapViewProps {
  locationData: LocationData | null;
  sourceData: LocationData | null;
  destinationData: LocationData | null;
  plannedLocations?: Array<{
    id: string;
    name: string;
    location: { lat: number; lng: number };
    type: string;
    address?: string;
    rating?: number;
    order?: number;
  }>;
}

// Custom Advanced Marker Component
interface AdvancedMarkerProps {
  position: { lat: number; lng: number };
  map: google.maps.Map | null;
  onClick?: () => void;
  title?: string;
  content?: HTMLElement;
}

const AdvancedMarker: React.FC<AdvancedMarkerProps> = ({ position, map, onClick, title, content }) => {
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  useEffect(() => {
    if (!map || !window.google?.maps?.marker?.AdvancedMarkerElement) return;

    // Create advanced marker
    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position,
      title,
      content: content || undefined,
    });

    // Add click listener if provided
    if (onClick) {
      marker.addListener('click', onClick);
    }

    markerRef.current = marker;

    // Cleanup
    return () => {
      if (markerRef.current) {
        markerRef.current.map = null;
      }
    };
  }, [map, position, onClick, title, content]);

  // Update position when it changes
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.position = position;
    }
  }, [position]);

  return null; // This component doesn't render anything directly
};

// Helper function to create numbered marker content
const createNumberedMarker = (number: number): HTMLElement => {
  const markerDiv = document.createElement('div');
  markerDiv.style.cssText = `
    width: 32px;
    height: 32px;
    background-color: #4F46E5;
    border: 3px solid white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 14px;
    color: white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    font-family: system-ui, -apple-system, sans-serif;
  `;
  markerDiv.textContent = number.toString();
  return markerDiv;
};

const polylineOptions = {
  strokeColor: "#FF0000",
  strokeOpacity: 0.8,
  strokeWeight: 4,
};

export default function MapView({
  locationData,
  sourceData,
  destinationData,
  plannedLocations = [],
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isLoaded, loadError } = useGoogleMaps();
  const [center, setCenter] = useState({ lat: 40.7128, lng: -74.006 }); // Default to NYC
  const [path, setPath] = useState<{ lat: number; lng: number }[]>([]);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    null
  );
  const [streetViewVisible, setStreetViewVisible] = useState(false);

  const origin = sourceData?.location;
  const destination = destinationData?.location;

  const waypoints = [
    {
      id: 1,
      location: origin,
      stopover: true,
      title: "Origin",
    },
    {
      id: 2,
      location: {
        lat: 41.741349,
        lng: -92.728344,
      },
      stopover: true,
      title: "Waypoint",
    },
    {
      id: 3,
      location: destination,
      stopover: true,
      title: "Destination",
    },
  ];

  // Sanitize waypoints for Google Maps Directions API (remove id and title properties)
  const sanitizedWaypoints = waypoints
    .filter(waypoint => waypoint.location) // Only include waypoints with valid locations
    .map(({ location, stopover }) => ({
      location,
      stopover
    }));

  useEffect(() => {
    if (isLoaded && sourceData && destinationData) {
      const fetchRoute = async () => {
        const path = await getRoute(sourceData, destinationData);
        setCenter(path ? path[0] : { lat: 40.7128, lng: -74.006 });
        setPath(path || []);
      };
      fetchRoute();
    }
  }, [isLoaded, sourceData, destinationData]);

  const directionsCallback = useCallback((response: any) => {
    if (response !== null && response.status === "OK") {
      setDirectionsResponse(response);
      console.log("Directions response:", response.data);
    } else {
      console.error("Directions request failed:", response);
    }
  }, []);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    
    const bounds = new window.google.maps.LatLngBounds();
    path.forEach((point) => bounds.extend(point));
    if (path.length > 0) {
      map.fitBounds(bounds);
    }
  }, [path]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  return (
    <>
      {isLoaded && (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={center}
          zoom={18}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            mapId: "DEMO_MAP_ID", // Required for Advanced Markers
          }}
        >
          {!directionsResponse && origin && destination && (
            <DirectionsService
              options={{
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode.DRIVING,
                waypoints: sanitizedWaypoints,
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
              }}
            />
          )}
          
          {/* Render Advanced Markers for waypoints */}
          {waypoints.map((waypoint) => (
            waypoint.location && (
              <AdvancedMarker
                key={waypoint.id}
                position={waypoint.location}
                map={map}
                title={waypoint.title}
                onClick={() => {
                  setSelectedLocation({
                    country: "",
                    city: "",
                    location: waypoint.location!,
                  });
                  setStreetViewVisible(false);
                }}
              />
            )
          ))}

          {/* Render Advanced Markers for planned locations */}
          {plannedLocations.map((location) => (
            <AdvancedMarker
              key={location.id}
              position={location.location}
              map={map}
              title={`${location.order ? `${location.order}. ` : ''}${location.name} (${location.type})`}
              content={location.order ? createNumberedMarker(location.order) : undefined}
              onClick={() => {
                setSelectedLocation({
                  country: "",
                  city: "",
                  location: location.location,
                });
                setStreetViewVisible(false);
              }}
            />
          ))}
          
          {selectedLocation && (
            <InfoWindow
              position={selectedLocation.location}
              onCloseClick={() => setSelectedLocation(null)}
            >
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
                position: selectedLocation.location,
                pov: { heading: 165, pitch: 0 },
                visible: true,
                zoom: 1,
              }}
            />
          )}
        </GoogleMap>
      )}
      {(!isLoaded || isLoading) && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <p className="text-gray-700">
              {!isLoaded ? "Loading Google Maps..." : "Loading street view..."}
            </p>
          </div>
        </div>
      )}
      {(error || loadError) && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 max-w-md">
            <p className="text-red-600">{error || loadError}</p>
          </div>
        </div>
      )}
    </>
  );
}
