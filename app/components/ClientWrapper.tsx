"use client";

import { GoogleMapsProvider } from "../contexts/GoogleMapsContext";

interface ClientWrapperProps {
  children: React.ReactNode;
}

export default function ClientWrapper({ children }: ClientWrapperProps) {
  return <GoogleMapsProvider>{children}</GoogleMapsProvider>;
}
