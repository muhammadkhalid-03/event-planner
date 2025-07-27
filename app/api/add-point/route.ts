import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { 
      currentLocations,
      eventDescription,
      startingLocation,
      radius
    } = await request.json();

    console.log(`➕ Adding new point to route for event: ${eventDescription}`);

    // Search for nearby places using Google Places API
    const placesData = await searchNearbyPlaces({
      latitude: startingLocation.location.lat,
      longitude: startingLocation.location.lng,
      radiusInMeters: radius || 1000,
      placeTypes: ["restaurant", "park", "night_club"],
    });

    if (!placesData || placesData.length === 0) {
      return NextResponse.json(
        { success: false, error: "No places found in the specified area" },
        { status: 404 }
      );
    }

    // Filter out existing locations to avoid duplicates
    const existingIds = new Set(currentLocations.map((loc: any) => loc.id));
    const availablePlaces = placesData.filter(place => 
      !existingIds.has(place.id)
    );

    if (availablePlaces.length === 0) {
      return NextResponse.json(
        { success: false, error: "No additional places found" },
        { status: 404 }
      );
    }

    // Analyze current route to determine what type of place to add
    const currentTypes = currentLocations.map((loc: any) => loc.type);
    const typeCounts = currentTypes.reduce((acc: any, type: string) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Determine what type of place to add based on current route
    let targetType = "restaurant"; // default
    if (!typeCounts.restaurant || typeCounts.restaurant < 2) {
      targetType = "restaurant";
    } else if (!typeCounts.park || typeCounts.park < 1) {
      targetType = "park";
    } else if (!typeCounts.club || typeCounts.club < 1) {
      targetType = "club";
    } else {
      // If we have a good mix, just pick the best rated place
      targetType = "restaurant";
    }

    // Find places of the target type, sorted by rating
    const targetTypePlaces = availablePlaces.filter(place => 
      place.placeType === targetType
    );

    let newLocation;
    if (targetTypePlaces.length > 0) {
      // Prefer places of the target type, sorted by rating
      newLocation = targetTypePlaces
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    } else {
      // Fallback to any available place, sorted by rating
      newLocation = availablePlaces
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    }

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

    console.log(`✅ Added new point: ${formattedLocation.name} (${formattedLocation.type})`);

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
      { status: 500 }
    );
  }
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
      (place, index, self) => index === self.findIndex((p) => p.id === place.id)
    );

    console.log(`🔍 Found ${uniquePlaces.length} unique places`);
    return uniquePlaces;
  } catch (error) {
    console.error("Error searching places:", error);
    throw new Error("Failed to search for nearby places");
  }
} 