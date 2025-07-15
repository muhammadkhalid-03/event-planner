"use client";

import { useState, useCallback } from 'react';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';

export interface PlaceResult {
  id: string;
  displayName: string;
  location: {
    latitude: number;
    longitude: number;
  };
  businessStatus?: string;
  placeType: string;
  types?: string[];
}

// Enhanced interface for detailed place information
export interface DetailedPlaceResult {
  id: string;
  displayName: string;
  formattedAddress?: string;
  location: {
    lat: number;
    lng: number;
  } | null;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: number;
  businessStatus?: string;
  types?: string[];
  phoneNumber?: string;
  websiteURI?: string;
  placeType: string;
  regularOpeningHours?: {
    openNow?: boolean;
    periods?: any[];
    weekdayDescriptions?: string[];
  } | null;
  reviews?: Array<{
    authorName?: string;
    rating?: number;
    text?: string;
    publishTime?: string;
    relativePublishTimeDescription?: string;
  }>;
  photos?: Array<{
    name?: string;
    widthPx?: number;
    heightPx?: number;
    authorAttributions?: any[];
  }>;
  editorialSummary?: string;
  accessibilityOptions?: any;
  paymentOptions?: any;
  parkingOptions?: any;
  allowsDogs?: boolean;
  goodForChildren?: boolean;
  goodForGroups?: boolean;
  restroom?: boolean;
  servesBreakfast?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  servesBeer?: boolean;
  servesWine?: boolean;
  servesVegetarianFood?: boolean;
  takeout?: boolean;
  delivery?: boolean;
  dineIn?: boolean;
  curbsidePickup?: boolean;
  reservable?: boolean;
  servesCocktails?: boolean;
  servesDesert?: boolean;
  servesCoffee?: boolean;
  detailsFetchedAt?: string;
}

export interface PlacesSearchParams {
  latitude: number;
  longitude: number;
  radiusInMeters: number;
  placeTypes?: string[];
}

// Available place types with their Google Places API equivalents
export const PLACE_TYPES = {
  restaurants: 'restaurant',
  parks: 'park',
  clubs: 'night_club'
} as const;

export const usePlacesSearch = () => {
  const { isLoaded, loadError } = useGoogleMaps();
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchNearbyPlaces = useCallback(async (params: PlacesSearchParams): Promise<PlaceResult[]> => {
    if (!isLoaded || loadError) {
      setSearchError('Google Maps API not loaded');
      return [];
    }

    setIsSearching(true);
    setSearchError(null);
    setPlaces([]);

    try {
      const { Place, SearchNearbyRankPreference } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
      
      // Default to all types if none specified
      const searchTypes = params.placeTypes || Object.values(PLACE_TYPES);
      
      const allPlaces: PlaceResult[] = [];
      
      // Search for each place type separately to ensure we get results for each category
      for (const placeType of searchTypes) {
        const request = {
          fields: ['id', 'displayName', 'location', 'businessStatus', 'types'],
          locationRestriction: {
            center: {
              lat: params.latitude,
              lng: params.longitude,
            },
            radius: params.radiusInMeters,
          },
          includedPrimaryTypes: [placeType],
          maxResultCount: 20,
          rankPreference: SearchNearbyRankPreference.POPULARITY,
          language: 'en-US',
          region: 'us',
        };

        try {
          // @ts-ignore
          const { places: searchResults } = await Place.searchNearby(request);
          
          if (searchResults && searchResults.length > 0) {
            const formattedPlaces: PlaceResult[] = searchResults
              .filter(place => place.id && place.location)
              .map((place) => {
                // Determine the primary place type for display
                let primaryType = 'restaurant';
                if (placeType === 'park') primaryType = 'park';
                if (placeType === 'night_club') primaryType = 'club';
                
                return {
                  id: place.id!,
                  displayName: place.displayName || `Unknown ${primaryType}`,
                  location: {
                    latitude: place.location!.lat(),
                    longitude: place.location!.lng(),
                  },
                  businessStatus: place.businessStatus ?? undefined,
                  placeType: primaryType,
                  types: place.types || []
                }
              });
            
            allPlaces.push(...formattedPlaces);
          }
        } catch (typeError) {
          console.warn(`Error searching for ${placeType}:`, typeError);
        }
        
        // Add a small delay between searches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Remove duplicates based on place ID
      const uniquePlaces = allPlaces.filter((place, index, self) => 
        index === self.findIndex(p => p.id === place.id)
      );
      
      setPlaces(uniquePlaces);
      return uniquePlaces;
      
    } catch (error) {
      console.error('Places search error:', error);
      setSearchError(error instanceof Error ? error.message : 'Failed to search places');
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [isLoaded, loadError]);

  return {
    places,
    isSearching,
    searchError,
    searchNearbyPlaces,
    PLACE_TYPES,
  };
};
