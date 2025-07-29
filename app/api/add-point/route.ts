import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const {
      currentLocations,
      eventDescription,
      startingLocation,
      radius,
      selectedPlaceTypes,
    } = await request.json();

    console.log(`➕ Adding new point to route for event: ${eventDescription}`);
    console.log(
      `🎯 Using selected place types: ${selectedPlaceTypes?.join(", ") || "fallback types"}`,
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
        { status: 404 },
      );
    }

    // Filter out existing locations to avoid duplicates
    const existingIds = new Set<string>(
      currentLocations.map((loc: any) => String(loc.id)),
    );
    let availablePlaces = placesData.filter(
      (place) => !existingIds.has(String(place.id)),
    );

    console.log(
      `🔍 Filtered out ${placesData.length - availablePlaces.length} existing locations from ${placesData.length} found places`,
    );

    // Always try api_logs for more variety when we have limited options
    if (availablePlaces.length < 15) {
      console.log(
        `🔄 Only ${availablePlaces.length} alternatives found, expanding with api_logs...`,
      );
      const additionalPlaces = await getPlacesFromApiLogs(
        startingLocation,
        radius,
        placeTypesToUse,
        existingIds,
      );
      availablePlaces.push(...additionalPlaces);

      // Remove duplicates after combining
      availablePlaces = availablePlaces.filter(
        (place, index, self) =>
          index === self.findIndex((p) => p.id === place.id),
      );

      console.log(
        `📈 Expanded to ${availablePlaces.length} total alternatives for adding`,
      );
    }

    // If still limited, try a broader search
    if (availablePlaces.length < 10) {
      console.log(
        "🔍 Still limited alternatives for adding, trying broader search...",
      );
      const broaderPlaces = await searchNearbyPlaces({
        latitude: startingLocation.location.lat,
        longitude: startingLocation.location.lng,
        radiusInMeters: (radius || 1000) * 2,
        placeTypes: [
          "restaurant",
          "cafe",
          "park",
          "museum",
          "tourist_attraction",
          "art_gallery",
          "shopping_mall",
        ],
      });

      const newBroaderPlaces = broaderPlaces.filter(
        (place) =>
          !existingIds.has(String(place.id)) &&
          !availablePlaces.find((existing) => existing.id === place.id),
      );

      availablePlaces.push(...newBroaderPlaces);
      console.log(
        `🌐 Added ${newBroaderPlaces.length} places from broader search for adding`,
      );
    }

    if (availablePlaces.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No additional places found even after checking saved data",
        },
        { status: 404 },
      );
    }

    // Intelligent selection for adding new points with variety
    let newLocation;

    // Analyze current route to understand what types we have
    const currentTypes = currentLocations.map((loc: any) => loc.type);
    const typeCounts = currentTypes.reduce((acc: any, type: string) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Build candidate pool with variety preferences
    let candidatePlaces = [...availablePlaces];

    // Prioritize types that are underrepresented in current route
    const underrepresentedTypes = placeTypesToUse.filter(
      (type: string) => (typeCounts[type] || 0) < 2, // Less than 2 of this type
    );

    if (underrepresentedTypes.length > 0) {
      const underrepresentedPlaces = candidatePlaces.filter((place) =>
        underrepresentedTypes.includes(place.placeType),
      );

      if (underrepresentedPlaces.length > 0) {
        candidatePlaces = underrepresentedPlaces; // Prefer underrepresented types
        console.log(
          `🎯 Prioritizing underrepresented types: ${underrepresentedTypes.join(", ")}`,
        );
      }
    }

    // If we still have too few options, expand the candidate pool
    if (candidatePlaces.length < 5) {
      candidatePlaces = availablePlaces.filter(
        (place) => (place.rating || 0) >= 3.5, // Any decent place
      );
    }

    if (candidatePlaces.length === 0) {
      candidatePlaces = availablePlaces; // Last resort
    }

    // Smart selection with randomization among good choices
    const sortedCandidates = candidatePlaces.sort(
      (a, b) => (b.rating || 0) - (a.rating || 0),
    );

    // Pick randomly from top candidates to add variety
    const topCandidates = sortedCandidates.slice(
      0,
      Math.min(8, candidatePlaces.length),
    );
    const randomIndex = Math.floor(Math.random() * topCandidates.length);
    newLocation = topCandidates[randomIndex];

    console.log(
      `➕ Selected from ${candidatePlaces.length} candidates, picked: ${newLocation.displayName} (${newLocation.placeType})`,
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
      order: currentLocations.length + 1, // Add to the end
    };

    console.log(
      `✅ Added new point: ${formattedLocation.name} (${formattedLocation.type})`,
    );

    return NextResponse.json({
      success: true,
      newLocation: formattedLocation,
    });
  } catch (error) {
    console.error("❌ Error adding point:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add point. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Helper function to get additional places from api_logs when current search is insufficient
async function getPlacesFromApiLogs(
  startingLocation: any,
  radius: number,
  placeTypes: string[],
  existingIds: Set<string>,
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
          file.endsWith(".json"),
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

        // Filter places with flexible criteria for better variety
        const matchingPlaces = data.places.filter((place: any) => {
          // Skip if already in existing locations
          if (existingIds.has(String(place.id))) return false;

          // More flexible place type matching for add-point
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

          // More generous distance check for add-point fallback
          if (place.location && startingLocation.location) {
            const distance = calculateDistance(
              startingLocation.location.lat,
              startingLocation.location.lng,
              place.location.lat,
              place.location.lng,
            );
            // Allow places within 3x the original radius
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
          index === self.findIndex((p) => p.id === place.id),
      )
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    console.log(
      `📂 Found ${uniquePlaces.length} additional places from api_logs`,
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
  lng2: number,
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

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
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
      (place, index, self) =>
        index === self.findIndex((p) => p.id === place.id),
    );

    console.log(`🔍 Found ${uniquePlaces.length} unique places`);
    return uniquePlaces;
  } catch (error) {
    console.error("Error searching places:", error);
    throw new Error("Failed to search for nearby places");
  }
}
