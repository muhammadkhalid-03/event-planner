/// <reference types="google.maps" />
"use client";

import React, { useEffect, useState, useRef } from "react";
import { OverlayView } from "@react-google-maps/api";
import { PlannedLocation } from "../stores/placesStore";
import { Badge } from "../../components/ui/badge";

// Helper function to check if an ID looks like a Google Place ID
const isGooglePlaceId = (id: string | undefined): boolean => {
  return Boolean(
    id &&
      (id.startsWith("ChIJ") ||
        id.startsWith("GhIJ") ||
        id.startsWith("EhIJ") ||
        id.startsWith("EkIJ")),
  );
};

// Photo fetching service
const fetchPlacePhotos = async (placeId: string): Promise<string[]> => {
  try {
    const { Place } = (await google.maps.importLibrary(
      "places",
    )) as google.maps.PlacesLibrary;

    const place = new Place({
      id: placeId,
      requestedLanguage: "en",
    });

    await place.fetchFields({
      fields: ["photos"],
    });

    if (place.photos && place.photos.length > 0) {
      // Get up to 3 photos and return their URLs
      return place.photos.slice(0, 3).map((photo) => {
        return photo.getURI({ maxHeight: 200, maxWidth: 300 });
      });
    }

    return [];
  } catch (error) {
    console.error("Error fetching place photos:", error);
    return [];
  }
};

// Photo Gallery Component with Carousel
const PhotoGallery: React.FC<{ placeId: string }> = ({ placeId }) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isGooglePlaceId(placeId)) {
      setLoading(false);
      return;
    }

    const loadPhotos = async () => {
      try {
        setLoading(true);
        const photoUrls = await fetchPlacePhotos(placeId);
        setPhotos(photoUrls);
        setError(false);
        setCurrentIndex(0); // Reset to first photo
      } catch (err) {
        console.error("Failed to load photos:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();
  }, [placeId]);

  const nextPhoto = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === photos.length - 1 ? 0 : prevIndex + 1,
    );
  };

  const prevPhoto = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? photos.length - 1 : prevIndex - 1,
    );
  };

  const goToPhoto = (index: number) => {
    setCurrentIndex(index);
  };

  if (loading) {
    return (
      <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
          <span className="text-xs">Loading photos...</span>
        </div>
      </div>
    );
  }

  if (error || photos.length === 0) {
    return (
      <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center">
        <div className="text-center text-gray-500">
          <svg
            className="w-6 h-6 mx-auto mb-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs">No photos available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Carousel Container */}
      <div className="relative w-full h-32 bg-gray-100 rounded-md overflow-hidden group">
        {/* Current Photo */}
        <img
          src={photos[currentIndex]}
          alt={`Location photo ${currentIndex + 1}`}
          className="w-full h-full object-cover cursor-pointer transition-transform duration-300 hover:scale-105"
          onClick={() => {
            window.open(photos[currentIndex], "_blank");
          }}
          onError={(e) => {
            console.error("Failed to load photo:", photos[currentIndex]);
            // Try to go to next photo if current one fails
            if (photos.length > 1) {
              nextPhoto();
            }
          }}
        />

        {/* Navigation Arrows - Only show if more than 1 photo */}
        {photos.length > 1 && (
          <>
            {/* Previous Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevPhoto();
              }}
              className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
              aria-label="Previous photo"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Next Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextPhoto();
              }}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
              aria-label="Next photo"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        {/* Photo Counter/Enlarge Hint Overlay */}
        <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-1">
            <svg
              className="w-2 h-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
              />
            </svg>
            <span>Click to enlarge</span>
          </div>
        </div>

        {/* Photo Count Indicator */}
        {photos.length > 1 && (
          <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded">
            {currentIndex + 1} / {photos.length}
          </div>
        )}

        {/* Dots Indicator - Only show if more than 1 photo */}
        {photos.length > 1 && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
            {photos.map((_, index) => (
              <button
                key={index}
                onClick={() => goToPhoto(index)}
                className={`w-1 h-1 rounded-full transition-all duration-200 ${
                  index === currentIndex
                    ? "bg-white scale-110 shadow-md"
                    : "bg-white bg-opacity-60 hover:bg-opacity-80"
                }`}
                aria-label={`Go to photo ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// InfoWindow Props Interface
interface InfoWindowProps {
  location: PlannedLocation;
  position: google.maps.LatLng;
  onClose: () => void;
  index: number;
  onStreetView: () => void;
}

// Custom InfoWindow Component with Google Maps-style design
const InfoWindow: React.FC<InfoWindowProps> = ({
  location,
  position,
  onClose,
  index,
  onStreetView,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <OverlayView
      position={position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div
        ref={overlayRef}
        className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-sm relative"
        style={{
          transform: "translate(-50%, -100%)",
          marginBottom: "15px",
          minWidth: "280px",
          maxWidth: "320px",
        }}
      >
        {/* Arrow pointing to the marker */}
        <div
          className="absolute border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"
          style={{
            bottom: "-8px",
            left: "50%",
            transform: "translateX(-50%)",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
          }}
        />

        {/* Header with close button */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <Badge className="bg-red-600 text-white rounded-full px-1 py-0.5 text-xs font-medium">
              {index + 1}
            </Badge>
            <h3 className="font-semibold text-gray-900 text-xs truncate max-w-[160px]">
              {location.name || "Location"}
            </h3>
          </div>
          <button
            className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Photo Gallery */}
        <div className="px-3 py-1.5 border-b border-gray-100">
          <PhotoGallery placeId={location.id} />
        </div>

        {/* Content */}
        <div className="px-3 py-1.5 space-y-1">
          {/* Address */}
          {location.formatted_address && (
            <div className="flex items-start gap-1.5">
              <svg
                className="w-2.5 h-2.5 text-gray-500 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-xs text-gray-600 leading-tight">
                {location.formatted_address}
              </span>
            </div>
          )}

          {/* Rating */}
          {location.rating && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-2.5 h-2.5 ${
                      i < Math.floor(location.rating!)
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-xs font-medium text-gray-900">
                {location.rating.toFixed(1)}
              </span>
              {location.user_rating_total && (
                <span className="text-xs text-gray-500">
                  ({location.user_rating_total.toLocaleString()})
                </span>
              )}
            </div>
          )}

          {/* Price Level */}
          {location.price_level && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-600">Price:</span>
              <div className="flex">
                {[...Array(4)].map((_, i) => (
                  <span
                    key={i}
                    className={`text-xs ${
                      i < location.price_level!
                        ? "text-green-600"
                        : "text-gray-300"
                    }`}
                  >
                    $
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {location.tags && location.tags.length > 0 && (
            <div className="space-y-0.5">
              <span className="text-xs text-gray-600">Categories:</span>
              <div className="flex flex-wrap gap-0.5">
                {location.tags.slice(0, 4).map((tag: string) => (
                  <Badge
                    variant="secondary"
                    key={tag}
                    className="text-xs px-1 py-0"
                  >
                    {tag
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Badge>
                ))}
                {location.tags.length > 4 && (
                  <span className="text-xs text-gray-500 px-1 py-0">
                    +{location.tags.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 px-3 py-1.5 border-t border-gray-100 bg-gray-50 rounded-b-lg">
          <button
            className="flex-1 bg-blue-600 text-white px-1.5 py-1 rounded text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-0.5"
            onClick={() => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${location.location.lat},${location.location.lng}`;
              window.open(url, "_blank");
            }}
          >
            <svg
              className="w-2.5 h-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            Directions
          </button>
          <button
            className="px-1.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-0.5"
            onClick={onStreetView}
          >
            <svg
              className="w-2.5 h-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            Street View
          </button>
        </div>
      </div>
    </OverlayView>
  );
};

export default InfoWindow;
export type { InfoWindowProps };
