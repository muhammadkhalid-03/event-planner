"use client";

import { useState, useEffect } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { usePlacesStore } from "../stores/placesStore";
import { sendEmail } from "../utils/send-email";

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
  ageRange: [number, number];
  budget: number;
  eventDescription: string;
  eventDate: string;
  startTime: string;
  endTime: string;
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
      eventDate: string;
      startTime: string;
      endTime: string;
    };
    selectedPlaceTypes?: string[];
  };
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

interface LocationFormProps {
  onSubmit: (data: EventPlanData) => void;
}

export default function LocationForm({ onSubmit }: LocationFormProps) {
  const defaultLocation = { lat: 40.7128, lng: -74.006 };

  const [startingLocation, setStartingLocation] = useState<LocationData>({
    country: "",
    city: "",
    location: defaultLocation,
  });

  const [eventDate, setEventDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [numberOfPeople, setNumberOfPeople] = useState<number>(2);
  const [radius, setRadius] = useState<number>(5000);
  const [ageRange, setAgeRange] = useState<[number, number]>([1, 80]);
  const [budget, setBudget] = useState<number>(1000);

  const [eventDescription, setEventDescription] = useState<string>("");
  const [suggestedPlan, setSuggestedPlan] = useState<string>("");
  const { setLocations, setStartingLocation: setStoreStartingLocation } =
    usePlacesStore();
  const [selectedStartingLocationText, setSelectedStartingLocationText] =
    useState("");

  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [generationProgress, setGenerationProgress] = useState<number>(0);

  // Set initial starting location in store when component mounts
  useEffect(() => {
    setStoreStartingLocation(defaultLocation);
  }, [setStoreStartingLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!startingLocation.location.lat || !startingLocation.location.lng) {
      setPlanError("Please select a valid starting location");
      return;
    }

    if (!eventDescription.trim()) {
      setPlanError("Please describe your event");
      return;
    }

    if (!eventDate || !startTime || !endTime) {
      setPlanError("Please select a valid event date and time");
      return;
    }

    const start = new Date(`${eventDate} ${startTime}`);
    const end = new Date(`${eventDate} ${endTime}`);
    let hourRange = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    if (end <= start) {
      setPlanError("End time must be after start time.");
      return;
    }
    if (hourRange < 1) {
      setPlanError("Minimum event duration is 1 hour.");
      return;
    }

    setIsGeneratingPlan(true);
    setGenerationProgress(0);
    setPlanError(null);
    setSuggestedPlan(
      "🔍 Searching for nearby places...\n🤖 Generating multiple route options..."
    );

    try {
      console.log("📍 Starting multiple routes generation workflow...");

      // Initializing request
      setGenerationProgress(20);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const response = await fetch("/api/generate-multiple-routes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startingLocation,
          hourRange,
          numberOfPeople,
          radius,
          ageRange,
          budget,
          eventDescription,
          eventDate,
          startTime,
          endTime,
          numberOfRoutes: 3, // Generate 3 different route options
        }),
      });

      setGenerationProgress(70);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const result = await response.json();

      // Data processed
      setGenerationProgress(80);
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (result.success) {
        // Processing routes
        setGenerationProgress(90);
        await new Promise((resolve) => setTimeout(resolve, 200));

        const firstRoute = result.routes[0];

        // Finalizing
        setGenerationProgress(95);
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Complete progress
        setGenerationProgress(100);
        setSuggestedPlan(firstRoute.suggestedPlan);
        setLocations(firstRoute.plannedLocations);
        onSubmit({
          startingLocation,
          hourRange,
          numberOfPeople,
          radius,
          ageRange,
          budget,
          eventDescription,
          eventDate,
          startTime,
          endTime,
          suggestedPlan: firstRoute.suggestedPlan,
          plannedLocations: firstRoute.plannedLocations,
          placesFound: result.placesFound,
          metadata: result.metadata,
          allRoutes: result.routes, // Pass all generated routes
        });

        console.log(
          `✅ Generated ${result.routes.length} route options! Found ${result.placesFound} places, first route includes ${firstRoute.plannedLocations.length} locations`
        );
      } else {
        setPlanError(result.error || "Failed to generate route options");
        setSuggestedPlan(
          "❌ Failed to generate route options. Please try again."
        );
      }
    } catch (error) {
      console.error("Error generating route options:", error);
      setPlanError(
        "Network error. Please check your connection and try again."
      );
      setSuggestedPlan("❌ Network error occurred. Please try again.");
    } finally {
      setIsGeneratingPlan(false);
      setGenerationProgress(0);
    }
  };

  const handleSendEmail = async () => {
    if (!userEmail.trim()) {
      alert("Please enter your email address");
      return;
    }

    if (!suggestedPlan.trim()) {
      alert("No plan available to send");
      return;
    }

    setIsSendingEmail(true);
    try {
      await sendEmail({ plan: suggestedPlan, email: userEmail });
    } catch (error) {
      console.error("Error sending email:", error);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const {
    ready: readyStartingLocation,
    value: startingLocationValue,
    suggestions: {
      status: startingLocationSuggestionsStatus,
      data: startingLocationSuggestionsData,
    },
    setValue: setStartingLocationValue,
    clearSuggestions: clearStartingLocationSuggestions,
  } = usePlacesAutocomplete({
    debounce: 300,
  });

  const handleStartingLocationInput = (e: any) => {
    setStartingLocationValue(e.target.value);
  };

  const handleStartingLocationSelect =
    ({ description }: { description: string }) =>
    () => {
      getGeocode({ address: description }).then((results) => {
        const { lat, lng } = getLatLng(results[0]);
        const newData = {
          country: "",
          city: "",
          location: { lat, lng },
        };

        setStartingLocation(newData);
        setSelectedStartingLocationText(description);
        setStartingLocationValue(description, false);
        clearStartingLocationSuggestions();

        // Update the store with the new starting location
        setStoreStartingLocation({ lat, lng });

        console.log(`Starting Location Coordinates: `, { lat, lng });
      });
    };

  const renderStartingLocationSuggestions = () =>
    startingLocationSuggestionsData.map((suggestion) => {
      const {
        place_id,
        structured_formatting: { main_text, secondary_text },
      } = suggestion;

      return (
        <li
          key={place_id}
          onClick={handleStartingLocationSelect(suggestion)}
          className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
        >
          <div className="text-sm">
            <strong className="text-gray-900">{main_text}</strong>
            <div className="text-gray-500 text-xs">{secondary_text}</div>
          </div>
        </li>
      );
    });

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="startingLocation"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Starting Location
          </label>
          <input
            type="text"
            id="startingLocation"
            name="startingLocation"
            value={startingLocationValue || selectedStartingLocationText}
            onChange={handleStartingLocationInput}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your starting location"
          />
          {startingLocationSuggestionsStatus === "OK" && (
            <ul className="mt-2 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto z-10">
              {renderStartingLocationSuggestions()}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event Date
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="numberOfPeople"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Number of People
          </label>
          <input
            type="number"
            step="1"
            id="numberOfPeople"
            name="numberOfPeople"
            value={numberOfPeople}
            onChange={(e) => {
              const value = Math.max( parseInt(e.target.value.replace(/^0+/, "")) || 0);
              setNumberOfPeople(value);
            }}
            min="1"
            max="100"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Number of people"
          />
        </div>

        <div>
          <label
            htmlFor="radius"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Radius (meters) : {radius}
          </label>
          <Slider
            min={10}
            max={5000}
            step={10}
            value={radius}
            onChange={(value) => setRadius(value as number)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Age Range: {ageRange[0]} - {ageRange[1]} years
          </label>
          <Slider
            range
            min={0}
            max={100}
            step={1}
            value={ageRange}
            onChange={(value) => setAgeRange(value as [number, number])}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Budget (USD per person): ${budget}
          </label>
          <Slider
            min={0}
            max={1000}
            step={10}
            value={budget}
            onChange={(value) => setBudget(value as number)}
          />
        </div>

        <div>
          <label
            htmlFor="eventDescription"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Description of Event
          </label>
          <textarea
            id="eventDescription"
            name="eventDescription"
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
            rows={3}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            placeholder="Describe your event theme or activities you're interested in..."
          />
        </div>

        <div>
          <label
            htmlFor="suggestedPlan"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Suggested Plan
          </label>
          <textarea
            id="suggestedPlan"
            name="suggestedPlan"
            value={suggestedPlan}
            readOnly
            rows={6}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-700 resize-none"
            placeholder="Your suggested plan will appear here after clicking Plan..."
          />
        </div>

        {planError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {planError}
          </div>
        )}

        <button
          type="submit"
          disabled={isGeneratingPlan}
          className={`w-full py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-200 font-medium ${
            isGeneratingPlan
              ? "bg-gray-400 text-gray-700 cursor-not-allowed"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
        >
          {isGeneratingPlan ? "🔄 Generating Plan..." : "Plan"}
        </button>

        {isGeneratingPlan && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1 text-center">
              {generationProgress}% complete
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="userEmail"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Your Email Address
          </label>
          <input
            type="email"
            id="userEmail"
            name="userEmail"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your email to receive the plan"
          />
        </div>

        <button
          type="button"
          onClick={handleSendEmail}
          disabled={isGeneratingPlan || isSendingEmail || !suggestedPlan}
          className={`w-full mt-2 py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200 font-medium ${
            isGeneratingPlan || isSendingEmail || !suggestedPlan
              ? "bg-gray-400 text-gray-700 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {isSendingEmail ? "✉️ Sending Email..." : "Send Plan via Email"}
        </button>
      </form>
    </div>
  );
}
