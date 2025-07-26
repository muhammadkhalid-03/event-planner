"use client";

import { useState } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { usePlacesStore } from "../stores/placesStore";
import { sendEmail } from "../utils/send-email";
import { useLLMStore } from "../stores/llmStore";

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

  const [hourRange, setHourRange] = useState<number>(2);
  const [numberOfPeople, setNumberOfPeople] = useState<number>(2);
  const [radius, setRadius] = useState<number>(1000);
  const [ageRange, setAgeRange] = useState<[number, number]>([1, 80]);
  const [budget, setBudget] = useState<number>(1000);

  const [eventDescription, setEventDescription] = useState<string>("");
  const [suggestedPlan, setSuggestedPlan] = useState<string>("");
  const { setLocations } = usePlacesStore();
  const [selectedStartingLocationText, setSelectedStartingLocationText] =
    useState("");

  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const setLLMResponse = useLLMStore((state) => state.setResponse);
  const llmResponse = useLLMStore((state) => state.response);

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

    setIsGeneratingPlan(true);
    setPlanError(null);
    setSuggestedPlan(
      "🔍 Searching for nearby places...\n🤖 Generating your personalized event plan..."
    );

    try {
      console.log("📍 Starting event plan generation workflow...");

      const response = await fetch("/api/generate-event-plan", {
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
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Display the generated plan
        setSuggestedPlan(result.eventPlan);
        setLocations(result.plannedLocations);
        console.log(llmResponse);
        setLLMResponse(result.eventPlan);
        // Pass the complete data to parent component including planned locations
        onSubmit({
          startingLocation,
          hourRange,
          numberOfPeople,
          radius,
          ageRange,
          budget,
          eventDescription,
          suggestedPlan: result.eventPlan,
          plannedLocations: result.plannedLocations,
          placesFound: result.placesFound,
          metadata: result.metadata,
        });

        console.log(
          `✅ Event plan generated! Found ${result.placesFound} places, plan includes ${result.plannedLocations.length} locations`
        );
      } else {
        setPlanError(result.error || "Failed to generate event plan");
        setSuggestedPlan("❌ Failed to generate event plan. Please try again.");
      }
    } catch (error) {
      console.error("Error generating event plan:", error);
      setPlanError(
        "Network error. Please check your connection and try again."
      );
      setSuggestedPlan("❌ Network error occurred. Please try again.");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      await sendEmail({ plan: suggestedPlan });
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

        console.log(`📍 Starting Location Coordinates: `, { lat, lng });
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
          <label
            htmlFor="hourRange"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Hour Range
          </label>
          <input
            type="number"
            id="hourRange"
            name="hourRange"
            value={hourRange}
            onChange={(e) => setHourRange(parseInt(e.target.value) || 0)}
            min="1"
            max="24"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="How many hours do you have?"
          />
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
            id="numberOfPeople"
            name="numberOfPeople"
            value={numberOfPeople}
            onChange={(e) => setNumberOfPeople(parseInt(e.target.value) || 0)}
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
            Radius (meters)
          </label>
          <input
            type="number"
            id="radius"
            name="radius"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value) || 0)}
            min="100"
            max="5000"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Search radius from starting location"
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
            Budget (USD): ${budget}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-700 resize-none"
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
