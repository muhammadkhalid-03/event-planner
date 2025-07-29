import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const {
      currentLocation,
      allCurrentLocations,
      eventDescription,
      startingLocation,
      radius,
      index,
      selectedPlaceTypes,
    } = await request.json();

    console.log(
      `🔄 Regenerating point ${index} for event: ${eventDescription}`
    );
    console.log(
      `🎯 Using selected place types: ${
        selectedPlaceTypes?.join(", ") || "fallback types"
      }`
    );

    // Use the originally selected place types from Gemini, with fallback
    const placeTypesToUse =
      selectedPlaceTypes && selectedPlaceTypes.length > 0
        ? selectedPlaceTypes
        : ["restaurant", "park", "night_club"];

    // Search for nearby places using Google Places API
    const placesData = await searchNearbyPlaces({
      latitude: startingLocation.location.lat,
      longitude: startingLocation.location.lng,
      radiusInMeters: radius || 1000,
      placeTypes: placeTypesToUse,
    });

    if (!placesData || placesData.length === 0) {
      return NextResponse.json(
        { success: false, error: "No places found in the specified area" },
        { status: 404 }
      );
    }

    // Filter out ALL current locations in the route to avoid duplicates
    const existingIds = new Set<string>(
      (allCurrentLocations || []).map((loc: any) => String(loc.id))
    );
    let availablePlaces = placesData.filter(
      (place) => !existingIds.has(String(place.id))
    );

    console.log(
      `🔍 Filtered out ${
        placesData.length - availablePlaces.length
      } existing locations from ${placesData.length} found places`
    );

    // Always try api_logs for more variety, not just when we have zero alternatives
    if (availablePlaces.length < 15) {
      console.log(
        `🔄 Only ${availablePlaces.length} alternatives found, expanding with api_logs...`
      );
      const additionalPlaces = await getPlacesFromApiLogs(
        startingLocation,
        radius,
        placeTypesToUse,
        existingIds
      );
      availablePlaces.push(...additionalPlaces);

      // Remove duplicates after combining
      availablePlaces = availablePlaces.filter(
        (place, index, self) =>
          index === self.findIndex((p) => p.id === place.id)
      );

      console.log(
        `📈 Expanded to ${availablePlaces.length} total alternatives`
      );
    }

    // If still limited, try a broader search with increased radius
    if (availablePlaces.length < 10) {
      console.log("🔍 Still limited alternatives, trying broader search...");
      const broaderPlaces = await searchNearbyPlaces({
        latitude: startingLocation.location.lat,
        longitude: startingLocation.location.lng,
        radiusInMeters: (radius || 1000) * 2, // Double the radius
        placeTypes: [
          "restaurant",
          "cafe",
          "park",
          "museum",
          "tourist_attraction",
          "art_gallery",
          "shopping_mall",
        ], // Common types
      });

      const newBroaderPlaces = broaderPlaces.filter(
        (place) =>
          !existingIds.has(String(place.id)) &&
          !availablePlaces.find((existing) => existing.id === place.id)
      );

      availablePlaces.push(...newBroaderPlaces);
      console.log(
        `🌐 Added ${newBroaderPlaces.length} places from broader search`
      );
    }

    if (availablePlaces.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No alternative places found even after checking saved data",
        },
        { status: 404 }
      );
    }

    // Intelligent selection with variety and flexibility
    let newLocation;

    // Step 1: Try same type places first
    const sameTypePlaces = availablePlaces.filter(
      (place) => place.placeType === currentLocation.type
    );

    // Step 2: If same type places are limited, expand to related types
    let candidatePlaces = [...sameTypePlaces];
    if (candidatePlaces.length < 5) {
      // Add places from the same selected place types (broader than current type)
      const relatedPlaces = availablePlaces.filter(
        (place) =>
          placeTypesToUse.includes(place.placeType) &&
          place.placeType !== currentLocation.type
      );
      candidatePlaces.push(...relatedPlaces);
    }

    // Step 3: If still limited, add any highly rated places
    if (candidatePlaces.length < 8) {
      const anyGoodPlaces = availablePlaces
        .filter((place) => (place.rating || 0) >= 4.0)
        .filter((place) => !candidatePlaces.find((cp) => cp.id === place.id));
      candidatePlaces.push(...anyGoodPlaces);
    }

    // Step 4: Remove duplicates and sort
    candidatePlaces = candidatePlaces.filter(
      (place, index, self) => index === self.findIndex((p) => p.id === place.id)
    );

    if (candidatePlaces.length === 0) {
      candidatePlaces = availablePlaces; // Last resort: use any available
    }

    // Step 5: Smart selection with randomization among top choices
    const topRatedPlaces = candidatePlaces
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, Math.min(10, candidatePlaces.length)); // Top 10 or all available

    // Add randomization to avoid always picking the same top place
    const randomIndex = Math.floor(
      Math.random() * Math.min(5, topRatedPlaces.length)
    ); // Random from top 5
    newLocation = topRatedPlaces[randomIndex];

    console.log(
      `🎲 Selected from ${candidatePlaces.length} candidates (${sameTypePlaces.length} same type, ${topRatedPlaces.length} top-rated)`
    );
    console.log(
      `🎯 Picked: ${newLocation.displayName} (${newLocation.placeType}, rating: ${newLocation.rating})`
    );

    // Convert to the expected format
    const formattedLocation = {
      id: newLocation.id,
      name: newLocation.displayName,
      location: newLocation.location,
      type: newLocation.placeType,
      tags: newLocation.types || [],
      formatted_address: newLocation.formattedAddress,
      rating: newLocation.rating,
      user_rating_total: newLocation.userRatingCount,
      price_level: newLocation.priceLevel,
      order: index + 1,
    };

    console.log(`✅ Regenerated point ${index}: ${formattedLocation.name}`);

    return NextResponse.json({
      success: true,
      newLocation: formattedLocation,
    });
  } catch (error) {
    console.error("❌ Error regenerating point:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to regenerate point. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to get additional places from api_logs when current search is insufficient
async function getPlacesFromApiLogs(
  startingLocation: any,
  radius: number,
  placeTypes: string[],
  existingIds: Set<string>
): Promise<any[]> {
  try {
    console.log("📂 Searching api_logs for additional places...");

    const logsDirectory = path.join(process.cwd(), "api_logs");
    const files = await readdir(logsDirectory);

    // Look for relevant JSON files (event plan files and multiple routes files)
    const relevantFiles = files
      .filter(
        (file) =>
          (file.startsWith("event-plan-places-") ||
            file.startsWith("multiple-routes-places-")) &&
          file.endsWith(".json")
      )
      .sort((a, b) => {
        // Sort by timestamp (newest first)
        const timestampA = parseInt(a.match(/(\d+)\.json$/)?.[1] || "0");
        const timestampB = parseInt(b.match(/(\d+)\.json$/)?.[1] || "0");
        return timestampB - timestampA;
      });

    const additionalPlaces: any[] = [];

    // Check more files for better variety (limit to 10 for expanded options)
    for (const file of relevantFiles.slice(0, 10)) {
      try {
        const filePath = path.join(logsDirectory, file);
        const content = await readFile(filePath, "utf-8");
        const data = JSON.parse(content);

        if (!data.places || !Array.isArray(data.places)) continue;

        // Filter places with more flexible criteria for better variety
        const matchingPlaces = data.places.filter((place: any) => {
          // Skip if already in existing locations
          if (existingIds.has(String(place.id))) return false;

          // More flexible place type matching:
          // 1. Exact match with selected place types
          // 2. OR any highly rated place (4+ stars)
          // 3. OR common venue types that work for most events
          const isExactMatch = placeTypes.includes(place.placeType);
          const isHighlyRated = (place.rating || 0) >= 4.0;
          const isCommonVenue = [
            "restaurant",
            "cafe",
            "park",
            "museum",
            "tourist_attraction",
            "art_gallery",
            "shopping_mall",
            "movie_theater",
          ].includes(place.placeType);

          if (!isExactMatch && !isHighlyRated && !isCommonVenue) {
            return false;
          }

          // More generous distance check for fallback scenarios
          if (place.location && startingLocation.location) {
            const distance = calculateDistance(
              startingLocation.location.lat,
              startingLocation.location.lng,
              place.location.lat,
              place.location.lng
            );
            // Allow places within 3x the original radius for API logs fallback
            if (distance > radius * 3) return false;
          }

          return true;
        });

        additionalPlaces.push(...matchingPlaces);

        // Stop if we have enough alternatives for good variety
        if (additionalPlaces.length >= 25) break;
      } catch (fileError) {
        console.warn(`⚠️ Error reading ${file}:`, fileError);
      }
    }

    // Remove duplicates and sort by rating
    const uniquePlaces = additionalPlaces
      .filter(
        (place, index, self) =>
          index === self.findIndex((p) => p.id === place.id)
      )
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    console.log(
      `📂 Found ${uniquePlaces.length} additional places from api_logs`
    );
    return uniquePlaces;
  } catch (error) {
    console.error("❌ Error reading api_logs:", error);
    return [];
  }
}

// Helper function to calculate distance between two coordinates (in meters)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Helper function to search for nearby places using Google Places API
async function searchNearbyPlaces(params: {
  latitude: number;
  longitude: number;
  radiusInMeters: number;
  placeTypes: string[];
}) {
  try {
    console.log("🔍 Searching for nearby places using Google Places API...");

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("Google Maps API key not configured");
    }

    const allPlaces = [];

    // Search for each place type separately to ensure we get results for each category
    for (const placeType of params.placeTypes) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${params.latitude},${params.longitude}&radius=${params.radiusInMeters}&type=${placeType}&key=${apiKey}`;

        const response = await fetch(url);

        if (!response.ok) {
          console.warn(`Error searching for ${placeType}: ${response.status}`);
          continue;
        }

        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const formattedPlaces = data.results
            .filter((place: any) => place.place_id && place.geometry)
            .map((place: any) => {
              let primaryType = "restaurant";
              if (placeType === "park") primaryType = "park";
              if (placeType === "night_club") primaryType = "club";

              return {
                id: place.place_id,
                displayName: place.name || `Unknown ${primaryType}`,
                formattedAddress: place.vicinity || place.formatted_address,
                location: {
                  lat: place.geometry.location.lat,
                  lng: place.geometry.location.lng,
                },
                rating: place.rating,
                userRatingCount: place.user_ratings_total,
                priceLevel: place.price_level,
                types: place.types || [],
                placeType: primaryType,
                businessStatus: place.business_status,
                photos: place.photos,
                detailsFetchedAt: new Date().toISOString(),
              };
            });

          allPlaces.push(...formattedPlaces);
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (typeError) {
        console.warn(`Error searching for ${placeType}:`, typeError);
      }
    }

    // Remove duplicates based on place ID
    const uniquePlaces = allPlaces.filter(
      (place, index, self) => index === self.findIndex((p) => p.id === place.id)
    );

    console.log(`🔍 Found ${uniquePlaces.length} unique places`);
    return uniquePlaces;
  } catch (error) {
    console.error("Error searching places:", error);
    throw new Error("Failed to search for nearby places");
  }
}
