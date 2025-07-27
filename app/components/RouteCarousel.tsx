// components/RouteCarousel.tsx
"use client";



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
  routeNumber?: number;
  routeName?: string;
}

interface RouteCarouselProps {
  routes: EventPlanData[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export default function RouteCarousel({
  routes,
  currentIndex,
  onSelect,
}: RouteCarouselProps) {
  const getRouteSummary = (route: EventPlanData) => {
    const locCount = route.plannedLocations?.length || 0;
    return `${locCount} locations • ${route.hourRange} hours`;
  };

  const getRouteDisplayName = (route: EventPlanData, index: number) => {
    if (route.routeName) {
      return route.routeName;
    }
    if (route.eventDescription) {
      return route.eventDescription.length > 30 
        ? route.eventDescription.substring(0, 30) + "..."
        : route.eventDescription;
    }
    return `Planned Route ${index + 1}`;
  };

  return (
    <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-xl shadow-lg py-1 px-[3px] mx-auto w-fit">
      <div className="flex gap-2 scrollbar-hide">
        {routes.map((route, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[160px] transition-all ${
              currentIndex === index
                ? "bg-indigo-100 border-2 border-indigo-500"
                : "bg-gray-50 hover:bg-gray-100"
            }`}
          >
            <span className="font-medium text-center truncate max-w-full">
              {getRouteDisplayName(route, index)}
            </span>
            <span className="text-xs text-gray-500 text-center mt-1">
              {getRouteSummary(route)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}