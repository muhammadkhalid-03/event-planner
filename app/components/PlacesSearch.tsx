"use client";

import React, { useState } from 'react';
import { usePlacesSearch, PlacesSearchParams, DetailedPlaceResult } from '../hooks/usePlacesSearch';
import Link from 'next/link';

export const PlacesSearch: React.FC = () => {
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState(500);
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailedPlaces, setDetailedPlaces] = useState<DetailedPlaceResult[]>([]);
  
  const { places, isSearching, searchError, searchNearbyPlaces } = usePlacesSearch();

  const fetchPlaceDetails = async (placeId: string): Promise<DetailedPlaceResult | null> => {
    try {
      const { Place } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
      
      // Create a new Place instance with the place ID
      const place = new Place({
        id: placeId,
        requestedLanguage: 'en', // Optional: specify language
      });

      // Fetch comprehensive place details
      await place.fetchFields({
        fields: [
          'displayName',
          'formattedAddress',
          'location',
          'rating',
          'userRatingCount',
          'priceLevel',
          'businessStatus',
          'types',
          'internationalPhoneNumber',
          'websiteURI',
          'regularOpeningHours',
          'reviews',
          'photos',
          'editorialSummary'
        ]
      });

      // Convert the Place object to a plain object with all the details
      return {
        id: place.id || placeId,
        displayName: place.displayName || 'Unknown Restaurant',
        formattedAddress: place.formattedAddress ?? undefined,
        location: place.location ? {
          lat: place.location.lat(),
          lng: place.location.lng()
        } : null,
        rating: place.rating ?? undefined,
        userRatingCount: place.userRatingCount ?? undefined,
        priceLevel: place.priceLevel ? Number(place.priceLevel) : undefined,
        businessStatus: place.businessStatus ?? undefined,
        types: place.types,
        phoneNumber: place.internationalPhoneNumber ?? undefined,
        websiteURI: place.websiteURI ?? undefined,
        regularOpeningHours: place.regularOpeningHours ? {
          /* @ts-ignore */
          openNow: place.regularOpeningHours.open_now,
          periods: place.regularOpeningHours.periods,
          /* @ts-ignore */
          weekdayDescriptions: place.regularOpeningHours.weekday_text
        } : null,
        reviews: place.reviews ? place.reviews.map(review => ({
          /* @ts-ignore */
          authorName: review.author_name ?? undefined,
          rating: review.rating ?? undefined,
          text: review.text ?? undefined,
          /* @ts-ignore */
          publishTime: review.time ? new Date(review.time * 1000).toISOString() : undefined,
          /* @ts-ignore */
          relativePublishTimeDescription: review.relative_time_description ?? undefined
        })) : [],
        photos: place.photos ? place.photos.slice(0, 5).map(photo => ({
          widthPx: photo.widthPx,
          heightPx: photo.heightPx,
          authorAttributions: photo.authorAttributions
        })) : [],
        editorialSummary: place.editorialSummary ?? undefined,
        // Add timestamp for when details were fetched
        detailsFetchedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching place details for', placeId, ':', error);
      return null;
    }
  };

  const saveRestaurantsToFile = async (restaurants: any[]) => {
    try {
      setIsLoadingDetails(true);
      
      // Fetch detailed information for each restaurant
      console.log(`Fetching details for ${restaurants.length} restaurants...`);
      const detailedRestaurants: DetailedPlaceResult[] = [];
      
      for (let i = 0; i < restaurants.length; i++) {
        const restaurant = restaurants[i];
        console.log(`Fetching details for ${restaurant.displayName} (${i + 1}/${restaurants.length})`);
        
        const details = await fetchPlaceDetails(restaurant.id);
        if (details) {
          detailedRestaurants.push(details);
        }
        
        // Add a small delay to avoid hitting rate limits
        if (i < restaurants.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setDetailedPlaces(detailedRestaurants);

      const response = await fetch('/api/save-restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates,
          radius,
          restaurants: detailedRestaurants,
          searchMetadata: {
            totalFound: restaurants.length,
            detailsEnhanced: detailedRestaurants.length,
            searchedAt: new Date().toISOString(),
            location: location,
            radiusMeters: radius
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`Successfully saved ${detailedRestaurants.length} restaurants with detailed information`);
        console.log(result.message);
      } else {
        console.error('Error saving restaurant data:', result.error);
      }
    } catch (error) {
      console.error('Error saving restaurant data:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!location.trim()) {
      alert('Please enter a location');
      return;
    }

    try {
      const geocoder = new google.maps.Geocoder();
      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ address: location }, (results, status) => {
          if (status === 'OK' && results) {
            resolve(results);
          } else {
            reject(new Error('Geocoding failed: ' + status));
          }
        });
      });

      if (result.length > 0) {
        const coords = result[0].geometry.location;
        const lat = coords.lat();
        const lng = coords.lng();
        
        setCoordinates({ lat, lng });
        
        const searchParams: PlacesSearchParams = {
          latitude: lat,
          longitude: lng,
          radiusInMeters: radius,
        };
        
        const searchResults = await searchNearbyPlaces(searchParams);
        if (searchResults && searchResults.length > 0) {
          await saveRestaurantsToFile(searchResults);
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Failed to find location. Please try a different address.');
    }
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setCoordinates({ lat, lng });
          setLocation(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          
          const searchParams: PlacesSearchParams = {
            latitude: lat,
            longitude: lng,
            radiusInMeters: radius,
          };
          
          const searchResults = await searchNearbyPlaces(searchParams);
          if (searchResults && searchResults.length > 0) {
            await saveRestaurantsToFile(searchResults);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Failed to get current location. Please enter an address manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Find Nearby Restaurants</h1>
      
      <form onSubmit={handleLocationSubmit} className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="location" className="block text-sm font-medium mb-2">
              Location (Address or Coordinates)
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter address or coordinates"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="sm:w-40">
            <label htmlFor="radius" className="block text-sm font-medium mb-2">
              Radius (meters)
            </label>
            <input
              id="radius"
              type="number"
              min="1"
              max="5000"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSearching || isLoadingDetails}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? 'Searching...' : isLoadingDetails ? 'Loading Details...' : 'Search Restaurants'}
          </button>
          
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={isSearching || isLoadingDetails}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Use Current Location
          </button>
        </div>
        
        {(isSearching || isLoadingDetails) && (
          <div className="text-sm text-gray-600">
            {isSearching && "🔍 Searching for nearby restaurants..."}
            {isLoadingDetails && "📋 Fetching detailed information for each restaurant..."}
          </div>
        )}
      </form>

      {searchError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {searchError}
        </div>
      )}

      {coordinates && (
        <div className="mb-4 p-4 bg-gray-100 rounded">
          <p><strong>Search Location:</strong> {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}</p>
          <p><strong>Radius:</strong> {radius} meters</p>
          <p><strong>Restaurants Found:</strong> {places.length}</p>
          {detailedPlaces.length > 0 && (
            <p><strong>Detailed Data Available:</strong> {detailedPlaces.length} restaurants</p>
          )}
          {detailedPlaces.length > 0 && (
            <div className="mt-3">
              <Link 
                href="/analyze" 
                className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                🤖 Analyze Restaurants with AI
              </Link>
            </div>
          )}
        </div>
      )}

      {detailedPlaces.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {detailedPlaces.map((place) => (
            <div key={place.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-lg mb-2">{place.displayName}</h3>
              
              {place.rating && (
                <div className="mb-2">
                  <p className="text-sm">
                    <strong>Rating:</strong> ⭐ {place.rating}/5
                    {place.userRatingCount && (
                      <span className="text-gray-600"> ({place.userRatingCount} reviews)</span>
                    )}
                  </p>
                </div>
              )}
              
              {place.formattedAddress && (
                <p className="text-sm mb-2">
                  <strong>Address:</strong> {place.formattedAddress}
                </p>
              )}
              
              {place.businessStatus && (
                <p className="text-sm mb-2">
                  <strong>Status:</strong> 
                  <span className={place.businessStatus === 'OPERATIONAL' ? 'text-green-600' : 'text-red-600'}>
                    {' ' + place.businessStatus}
                  </span>
                </p>
              )}
              
              {place.priceLevel && (
                <p className="text-sm mb-2">
                  <strong>Price Level:</strong> {'$'.repeat(place.priceLevel)}
                </p>
              )}

              {place.regularOpeningHours?.openNow !== undefined && (
                <p className="text-sm mb-2">
                  <strong>Currently:</strong> 
                  <span className={place.regularOpeningHours.openNow ? 'text-green-600' : 'text-red-600'}>
                    {place.regularOpeningHours.openNow ? ' Open' : ' Closed'}
                  </span>
                </p>
              )}

              {/* Service options */}
              <div className="text-xs text-gray-600 mt-2">
                {place.takeout && <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-1 mb-1">Takeout</span>}
                {place.delivery && <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded mr-1 mb-1">Delivery</span>}
                {place.dineIn && <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded mr-1 mb-1">Dine-in</span>}
                {place.reservable && <span className="inline-block bg-orange-100 text-orange-800 px-2 py-1 rounded mr-1 mb-1">Reservations</span>}
              </div>

              {/* Contact information */}
              {(place.phoneNumber || place.websiteURI) && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  {place.phoneNumber && (
                    <p className="text-xs text-gray-600">📞 {place.phoneNumber}</p>
                  )}
                  {place.websiteURI && (
                    <a href={place.websiteURI} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                      🌐 Website
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : places.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {places.map((place) => (
            <div key={place.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-lg mb-2">{place.displayName}</h3>
              
              {place.businessStatus && (
                <p className="text-sm">
                  <strong>Status:</strong> 
                  <span className={place.businessStatus === 'OPERATIONAL' ? 'text-green-600' : 'text-red-600'}>
                    {' ' + place.businessStatus}
                  </span>
                </p>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
