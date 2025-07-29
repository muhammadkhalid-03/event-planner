"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import AuthPopup from "./AuthPopup";

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
        <div className="filter blur-sm pointer-events-none">
          {children}
        </div>
        {/* Authentication popup */}
        <AuthPopup />
      </>
    );
  }

  return <>{children}</>;
}

export default function ClientWrapper({ children }: ClientWrapperProps) {
  return (
    <AuthProvider>
      <APIProvider
        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
        libraries={["places"]}
      >
        <AuthenticatedContent>{children}</AuthenticatedContent>
      </APIProvider>
    </AuthProvider>
  );
}
