import { FC } from "react";

interface MapViewProps {
  selectedLocation: {
    country: string;
    city: string;
    location: string;
  } | null;
}

declare const MapView: FC<MapViewProps>;
export default MapView;
