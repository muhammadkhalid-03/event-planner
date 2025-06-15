"use client";

import { useState } from "react";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";

interface LocationData {
  country: string;
  city: string;
  location: { lat: number; lng: number };
}

interface LocationFormProps {
  onSubmit: (data: {
    locationData: LocationData;
    sourceData: LocationData;
    destinationData: LocationData;
  }) => void;
}

export default function LocationForm({ onSubmit }: LocationFormProps) {
  const defaultLocation = { lat: 40.7128, lng: -74.006 };

  const [locationData, setLocationData] = useState<LocationData>({
    country: "",
    city: "",
    location: defaultLocation,
  });

  const [sourceData, setSourceData] = useState<LocationData>({
    country: "",
    city: "",
    location: defaultLocation,
  });

  const [destinationData, setDestinationData] = useState<LocationData>({
    country: "",
    city: "",
    location: defaultLocation,
  });

  const [activeField, setActiveField] = useState<
    "location" | "source" | "destination"
  >("location");

  const [selectedLocationText, setSelectedLocationText] = useState("");
  const [selectedSourceText, setSelectedSourceText] = useState("");
  const [selectedDestinationText, setSelectedDestinationText] = useState("");

  // const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const { name, value } = e.target;
  //   setFormData((prev) => ({
  //     ...prev,
  //     [name]: value,
  //   }));
  // };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("📍 All Location Data: ", {
      locationData,
      sourceData,
      destinationData,
    });
    onSubmit({ locationData, sourceData, destinationData });
  };

  const {
    ready: readyLocation,
    value: locationValue,
    suggestions: {
      status: locationSuggestionsStatus,
      data: locationSuggestionsData,
    },
    setValue: setLocationValue,
    clearSuggestions: clearLocationSuggestions,
  } = usePlacesAutocomplete({
    debounce: 300,
  });
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
  const {
    ready: readyDestination,
    value: destinationValue,
    suggestions: {
      status: destinationSuggestionsStatus,
      data: destinationSuggestionsData,
    },
    setValue: setDestinationValue,
    clearSuggestions: clearDestinationSuggestions,
  } = usePlacesAutocomplete({
    debounce: 300,
  });

  const handleLocationInput = (e: any) => {
    // Update the keyword of the input element
    setLocationValue(e.target.value);
  };
  const handleSourceInput = (e: any) => {
    // Update the keyword of the input element
    setSourceValue(e.target.value);
  };
  const handleDestinationInput = (e: any) => {
    // Update the keyword of the input element
    setDestinationValue(e.target.value);
  };
  // const handleInput = (e: any) => {
  //   // Update the keyword of the input element
  //   setValue(e.target.value);
  // };
  const handleSelect =
    ({ description }: { description: string }) =>
    () => {
      // When the user selects a place, we can replace the keyword without request data from API
      // by setting the second parameter to "false"
      // Get latitude and longitude via utility functions
      getGeocode({ address: description }).then((results) => {
        const { lat, lng } = getLatLng(results[0]);
        const newData = {
          country: "",
          city: "",
          location: { lat, lng },
        };

        // Update the correct data based on active field
        switch (activeField) {
          case "location":
            setLocationData(newData);
            setSelectedLocationText(description);
            setLocationValue(description, false);
            clearLocationSuggestions();
            break;
          case "source":
            setSourceData(newData);
            setSelectedSourceText(description);
            setSourceValue(description, false);
            clearSourceSuggestions();
            break;
          case "destination":
            setDestinationData(newData);
            setSelectedDestinationText(description);
            setDestinationValue(description, false);
            clearDestinationSuggestions();
            break;
        }

        console.log(`📍 ${activeField} Coordinates: `, { lat, lng });
      });
    };

  // Render suggestions for location
  const renderLocationSuggestions = () =>
    locationSuggestionsData.map((suggestion) => {
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

  // Render suggestions for destination
  const renderDestinationSuggestions = () =>
    destinationSuggestionsData.map((suggestion) => {
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
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* <div>
          <label
            htmlFor="country"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Country
          </label>
          <input
            type="text"
            id="country"
            name="country"
            value={formData.country}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your country"
          />
        </div>

        <div>
          <label
            htmlFor="city"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            City
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your city"
          />
        </div> */}

        <div>
          <label
            htmlFor="location"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Primary Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={
              activeField === "location" ? locationValue : selectedLocationText
            }
            onChange={handleLocationInput}
            onFocus={() => setActiveField("location")}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., neighborhood, landmark, address"
          />
          {locationSuggestionsStatus === "OK" && activeField === "location" && (
            <ul className="mt-2 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto z-10">
              {renderLocationSuggestions()}
            </ul>
          )}
        </div>

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
            value={activeField === "source" ? sourceValue : selectedSourceText}
            onChange={handleSourceInput}
            onFocus={() => setActiveField("source")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Starting point"
          />
          {sourceSuggestionsStatus === "OK" && activeField === "source" && (
            <ul className="mt-2 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto z-10">
              {renderSourceSuggestions()}
            </ul>
          )}
        </div>

        <div>
          <label
            htmlFor="destination"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Destination Location
          </label>
          <input
            type="text"
            id="destination"
            name="destination"
            value={
              activeField === "destination"
                ? destinationValue
                : selectedDestinationText
            }
            onChange={handleDestinationInput}
            onFocus={() => setActiveField("destination")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="End point"
          />
          {destinationSuggestionsStatus === "OK" &&
            activeField === "destination" && (
              <ul className="mt-2 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto z-10">
                {renderDestinationSuggestions()}
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
    </div>
  );
}
