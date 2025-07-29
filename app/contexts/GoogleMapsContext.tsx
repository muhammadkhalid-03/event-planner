"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export default interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: string | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: null,
});

export const useGoogleMaps = () => {
  const context = useContext(GoogleMapsContext);
  if (!context) {
    throw new Error("useGoogleMaps must be used within a GoogleMapsProvider");
  }
  return context;
};

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

export const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({
  children,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => setIsLoaded(true));
      existingScript.addEventListener("error", () =>
        setLoadError("Failed to load Google Maps")
      );
      return;
    }

    // Fetch the secure script URL from our API endpoint
    const loadGoogleMapsScript = async () => {
      try {
        const response = await fetch(
          "/api/google-maps-script?libraries=places,marker,geometry"
        );

        if (!response.ok) {
          throw new Error(`Failed to get script URL: ${response.status}`);
        }

        const { scriptUrl } = await response.json();

        if (!scriptUrl) {
          throw new Error("No script URL received from server");
        }

        // Load the Google Maps JavaScript API script
        const script = document.createElement("script");
        script.src = scriptUrl;
        script.async = true;
        script.defer = true;

        script.onload = () => {
          setIsLoaded(true);
        };

        script.onerror = () => {
          setLoadError(
            "Failed to load Google Maps. Please check your API key and ensure the Maps JavaScript API is enabled."
          );
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error("Error loading Google Maps script:", error);
        setLoadError(
          `Failed to load Google Maps script: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    };

    loadGoogleMapsScript();

    return () => {
      // Cleanup is handled by checking existing script
    };
  }, []);

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};
