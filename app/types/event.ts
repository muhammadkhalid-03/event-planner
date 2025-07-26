// types/event.ts
export interface LocationData {
  country: string;
  city: string;
  location: { lat: number; lng: number };
}

export interface EventPlanData {
  startingLocation: LocationData;
  hourRange: number;
  numberOfPeople: number;
  radius: number;
  eventDescription: string;
  suggestedPlan: string;
  plannedLocations?: Array<{
    id: string;
    name: string;
    location: { lat: number; lng: number };
    type: string;
    address?: string;
    rating?: number;
    order?: number;
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
    };
  };
}