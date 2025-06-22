export interface LatLng {
  lat: number;
  lng: number;
}

export interface Viewport {
  northeast: LatLng;
  southwest: LatLng;
}

export interface Geometry {
  location: LatLng;
  viewport: Viewport;
}

export interface OpeningHours {
  open_now: boolean;
}

export interface Photo {
  height: number;
  html_attributions: string[];
  photo_reference: string;
  width: number;
}

export interface PlusCode {
  compound_code: string;
  global_code: string;
}

export interface Business {
  business_status?: string;
  formatted_address?: string;
  geometry: Geometry;
  icon?: string;
  icon_background_color?: string;
  icon_mask_base_uri?: string;
  name: string;
  opening_hours?: OpeningHours;
  photos?: Photo[];
  place_id: string;
  plus_code?: PlusCode;
  price_level?: number;
  rating?: number;
  reference?: string;
  types?: string[];
  user_ratings_total?: number;
  scope?: string;
}

export interface Waypoint {
  location: LatLng;
  stopover: boolean;
}
