import axios from "axios";
import { decode } from "@googlemaps/polyline-codec";
import { LatLng, Waypoint } from "../types/businesses";

const headers = {
  "Content-Type": "application/json",
  "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  "X-Goog-FieldMask":
    "routes.duration,routes.distanceMeters,routes.legs,routes.polyline.encodedPolyline",
};
export async function getRoute(sourceData: LatLng, waypoints: Waypoint[]) {
  const url = "https://routes.googleapis.com/directions/v2:computeRoutes";

  const data = {
    origin: {
      location: {
        latLng: {
          latitude: sourceData.lat,
          longitude: sourceData.lng,
        },
      },
      sideOfRoad: true,
    },
    destination: {
      location: {
        latLng: {
          latitude: sourceData.lat,
          longitude: sourceData.lng,
        },
      },
    },
    intermediates: waypoints.map((waypoint) => ({
      location: {
        latLng: {
          latitude: waypoint.location.lat,
          longitude: waypoint.location.lng,
        },
      },
    })),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    computeAlternativeRoutes: false,
    routeModifiers: {
      avoidTolls: false,
      avoidHighways: false,
      avoidFerries: false,
    },
    languageCode: "en-US",
    units: "METRIC",
  }; // data

  try {
    const response = await axios.post(url, data, { headers });
    const decodedPolyline = decode(
      response.data.routes[0].polyline.encodedPolyline
    ); // returns an array of [lat, lng] tuples
    const path = decodedPolyline.map(([lat, lng]) => ({ lat, lng }));
    return path;
  } catch (error) {
    console.error("Error fetching route data:", error);
  }
}
