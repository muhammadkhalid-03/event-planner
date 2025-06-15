/// <reference path="../types/google-maps.d.ts" />
/// <reference types="google.maps" />
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "../contexts/GoogleMapsContext";
import { LocationData } from "../types/location";
import { getRoute } from "../api/mapServices";
import {
  GoogleMap,
  Polyline,
  Marker,
  DirectionsService,
  DirectionsRenderer,
  InfoWindow,
  StreetViewPanorama,
} from "@react-google-maps/api";

interface MapViewProps {
  locationData: LocationData | null;
  sourceData: LocationData | null;
  destinationData: LocationData | null;
}
const polylineOptions = {
  strokeColor: "#FF0000",
  strokeOpacity: 0.8,
  strokeWeight: 4,
};

const AnyReactComponent = ({ text }: { text: string }) => <div>{text}</div>;

export default function MapView({
  locationData,
  sourceData,
  destinationData,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
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
    },
    {
      id: 2,
      location: {
        lat: 41.741349,
        lng: -92.728344,
      },
      stopover: true,
    },
    {
      id: 3,
      location: destination,
      stopover: true,
    },
  ];

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

  // useEffect(() => {
  //   let center;
  //   if (!locationData) {
  //     center = { lat: 40.7128, lng: -74.006 };
  //   } else {
  //     center = locationData.location;
  //   }

  //   // Initialize the map once Google Maps is loaded and no location is selected
  //   if (isLoaded && mapRef.current) {
  //     const map = new google.maps.Map(mapRef.current, {
  //       center: center, // Default to New York City
  //       mapId: "DEMO_MAP_ID",
  //       zoom: 2,
  //     });

  //     new google.maps.marker.AdvancedMarkerElement({
  //       map,
  //       position: center,
  //     });

  //     const bounds = new google.maps.LatLngBounds();
  //     bounds.extend(center);

  //     // TODO: For street view panorama
  //     //   // Initialize the map once the script is loaded
  //     //   if (mapRef.current && !locationData) {
  //     //     new google.maps.StreetViewPanorama(mapRef.current, {
  //     //       position: { lat: 40.7128, lng: -74.006 }, // Default to New York City
  //     //       pov: { heading: 165, pitch: 0 },
  //     //       zoom: 1,
  //     //     });
  //     //   }
  //     // };

  //     map.setZoom(18);
  //   }
  // }, [isLoaded, locationData]);

  // TODO: For street view panorama

  // useEffect(() => {
  //   console.log("Selected location: ", selectedLocation);
  //   if (!selectedLocation || !mapRef.current || !isLoaded) return;

  //   setIsLoading(true);
  //   setError(null);

  //   // Geocode the address to get coordinates
  //   const geocoder = new google.maps.Geocoder();
  //   const address = `${selectedLocation.location}, ${selectedLocation.city}, ${selectedLocation.country}`;

  //   geocoder.geocode({ address }, (results, status) => {
  //     console.log("Status: ", status);
  //     if (status === "OK" && results && results[0]) {
  //       const location = results[0].geometry.location;

  //       // Initialize Street View
  //       const streetView = new google.maps.StreetViewService();
  //       streetView.getPanorama(
  //         {
  //           location: location,
  //           radius: 50,
  //         },
  //         (data, status) => {
  //           if (status === "OK") {
  //             new google.maps.StreetViewPanorama(mapRef.current!, {
  //               position: location,
  //               pov: { heading: 165, pitch: 0 },
  //               zoom: 1,
  //             });
  //             setIsLoading(false);
  //           } else {
  //             setError("Street View is not available for this location.");
  //             setIsLoading(false);
  //           }
  //         }
  //       );
  //     } else {
  //       setError("Could not find the specified location.");
  //       setIsLoading(false);
  //     }
  //   });
  // }, [selectedLocation, isLoaded]);

  return (
    <>
      {/* <div ref={mapRef} className="absolute inset-0" /> */}
      {isLoaded && (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={center}
          zoom={18}
          onLoad={(map) => {
            const bounds = new window.google.maps.LatLngBounds();
            path.forEach((point) => bounds.extend(point));
            map.fitBounds(bounds);
          }}
        >
          {!directionsResponse && origin && destination && (
            // get the directions using waypoints
            <DirectionsService
              options={{
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode.DRIVING,
                waypoints,
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
          {waypoints.map((waypoint) => (
            <Marker
              key={waypoint.id}
              position={waypoint.location || center}
              onClick={() => {
                setSelectedLocation({
                  country: "",
                  city: "",
                  location: waypoint.location || center,
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
          {/* <Polyline path={path} options={polylineOptions} /> */}
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
