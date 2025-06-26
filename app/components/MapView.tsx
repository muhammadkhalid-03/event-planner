/// <reference path="../types/google-maps.d.ts" />
/// <reference types="google.maps" />
"use client";

import { useCallback, useEffect, useState } from "react";
import { useGoogleMaps } from "../contexts/GoogleMapsContext";
import {
  GoogleMap,
  Marker,
  DirectionsService,
  DirectionsRenderer,
  InfoWindow,
  StreetViewPanorama,
} from "@react-google-maps/api";
import businessData from "../../api_logs/places-api-1750535962558.json";
import { Business, LatLng, Waypoint } from "../types/businesses";

const polylineOptions = {
  strokeColor: "#4285F4",
  strokeOpacity: 0.8,
  strokeWeight: 4,
};

export default function MapView({ sourceData }: { sourceData: LatLng | null }) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [center, setCenter] = useState({ lat: 40.7128, lng: -74.006 }); // Default to NYC
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);
  const [streetViewVisible, setStreetViewVisible] = useState(false);
  const [businessesData, setBusinessesData] = useState<Business[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  useEffect(() => {
    if (businessData.results) {
      const waypoints = businessData.results.slice(0, 3).map((business) => ({
        location: business.geometry.location,
        stopover: true,
      }));
      setWaypoints(waypoints);
      setBusinessesData(businessData.results);
    }
  }, []);

  const directionsCallback = useCallback((response: any) => {
    if (response !== null && response.status === "OK") {
      setDirectionsResponse(response);
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
      {isLoaded && (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={center}
          zoom={18}
          onLoad={(map) => {
            const bounds = new window.google.maps.LatLngBounds();
            // path.forEach((point) => bounds.extend(point));
            map.fitBounds(bounds);
          }}
        >
          {!directionsResponse &&
            sourceData &&
            waypoints &&
            waypoints.length > 0 && (
              <DirectionsService
                options={{
                  origin: sourceData,
                  destination: waypoints[waypoints.length - 1].location,
                  travelMode: google.maps.TravelMode.DRIVING,
                  waypoints: waypoints.slice(0, -1),
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
              }}
            />
          )}
          {waypoints.map((waypoint, index) => (
            <Marker
              key={index} // need an index here for React to keep track of array element
              position={waypoint.location || center}
              onClick={() => {
                setSelectedLocation(waypoint.location);
                setStreetViewVisible(false);
              }}
            />
          ))}
          {selectedLocation && (
            <InfoWindow position={selectedLocation}>
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
                position: selectedLocation,
                pov: { heading: 165, pitch: 0 },
                visible: true,
                zoom: 1,
              }}
            />
          )}
        </GoogleMap>
      )}
      {!isLoaded && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <p className="text-gray-700">
              {!isLoaded ? "Loading Google Maps..." : "Loading street view..."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
