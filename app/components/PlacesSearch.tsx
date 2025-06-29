"use client";

import React, { useState } from 'react';
import { usePlacesSearch, PlacesSearchParams } from '../hooks/usePlacesSearch';
import Link from 'next/link';

export const PlacesSearch: React.FC = () => {
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState(500);
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
  
  const { places, isSearching, searchError, searchNearbyPlaces } = usePlacesSearch();

  const saveRestaurantsToFile = async (restaurants: any[]) => {
    try {
      const response = await fetch('/api/save-restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates,
          radius,
          restaurants
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(result.message);
      } else {
        console.error('Error saving restaurant data:', result.error);
      }
    } catch (error) {
      console.error('Error saving restaurant data:', error);
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
        
        await searchNearbyPlaces(searchParams);
        if (places.length > 0) {
          await saveRestaurantsToFile(places);
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
          
          await searchNearbyPlaces(searchParams);
          if (places.length > 0) {
            await saveRestaurantsToFile(places);
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
            disabled={isSearching}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? 'Searching...' : 'Search Restaurants'}
          </button>
          
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={isSearching}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Use Current Location
          </button>
        </div>
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
          {places.length > 0 && (
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

      {places.length > 0 && (
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
      )}
    </div>
  );
};
