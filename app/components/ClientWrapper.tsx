"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import AuthPopup from "./AuthPopup";
import { useEffect, useState } from "react";

interface ClientWrapperProps {
  children: React.ReactNode;
}

function AuthenticatedContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {/* Blurred background content */}
        <div className="filter blur-sm pointer-events-none">{children}</div>
        {/* Authentication popup */}
        <AuthPopup />
      </>
    );
  }

  return <>{children}</>;
}

function SecureAPIProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch(
          "/api/google-maps-script?libraries=places"
        );

        if (!response.ok) {
          throw new Error(
            `Failed to get API configuration: ${response.status}`
          );
        }

        const { scriptUrl } = await response.json();

        // Extract API key from the script URL for use with APIProvider
        const urlParams = new URLSearchParams(scriptUrl.split("?")[1]);
        const key = urlParams.get("key");

        if (!key) {
          throw new Error("No API key found in server response");
        }

        setApiKey(key);
      } catch (error) {
        console.error("Error fetching API key:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading Maps...</p>
        </div>
      </div>
    );
  }

  if (error || !apiKey) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center text-center p-4">
          <div className="text-red-600 text-lg font-semibold mb-2">
            Failed to load Google Maps
          </div>
          <p className="text-gray-600">
            {error || "Unable to get API configuration"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={["places"]}>
      {children}
    </APIProvider>
  );
}

export default function ClientWrapper({ children }: ClientWrapperProps) {
  return (
    <AuthProvider>
      <SecureAPIProvider>
        <AuthenticatedContent>{children}</AuthenticatedContent>
      </SecureAPIProvider>
    </AuthProvider>
  );
}
