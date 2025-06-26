"use client";

import { useState } from "react";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { LatLng } from "../types/businesses";
import { useApiIsLoaded } from "@vis.gl/react-google-maps";

interface LocationFormProps {
  onSubmit: (sourceData: LatLng | null) => void;
}

export default function LocationForm({ onSubmit }: LocationFormProps) {
  const [sourceData, setSourceData] = useState<LatLng | null>(null);
  const apiIsLoaded = useApiIsLoaded();

  const [selectedSourceText, setSelectedSourceText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("📍 All Location Data: ", sourceData);
    onSubmit(sourceData);
  };

  const {
    ready: readySource,
    value: sourceValue,
    suggestions: {
      status: sourceSuggestionsStatus,
      data: sourceSuggestionsData,
    },
    setValue: setSourceValue,
    clearSuggestions: clearSourceSuggestions,
  } = usePlacesAutocomplete({
    debounce: 300,
  });
  const handleSourceInput = (e: any) => {
    // Update the keyword of the input element
    setSourceValue(e.target.value);
  };

  const handleSelect =
    ({ description }: { description: string }) =>
    () => {
      // When the user selects a place, we can replace the keyword without request data from API
      // by setting the second parameter to "false"
      // Get latitude and longitude via utility functions
      if (apiIsLoaded) {
        getGeocode({ address: description }).then((results) => {
          const { lat, lng } = getLatLng(results[0]);
          setSourceData({ lat, lng });
          setSelectedSourceText(description);
          setSourceValue(description);
          clearSourceSuggestions();
        });
      }
    };

  // Render suggestions for source
  const renderSourceSuggestions = () =>
    sourceSuggestionsData.map((suggestion) => {
      const {
        place_id,
        structured_formatting: { main_text, secondary_text },
      } = suggestion;

      return (
        <li
          key={place_id}
          onClick={handleSelect(suggestion)}
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
      {apiIsLoaded && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="source"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Source Location
            </label>
            <input
              type="text"
              id="source"
              name="source"
              value={sourceValue}
              onChange={handleSourceInput}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Starting point"
            />
            {sourceSuggestionsStatus === "OK" && (
              <ul className="mt-2 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto z-10">
                {renderSourceSuggestions()}
              </ul>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-200 font-medium"
          >
            Show Street View
          </button>
        </form>
      )}
    </div>
  );
}
