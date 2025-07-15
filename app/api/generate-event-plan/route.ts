import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";


export async function POST(request: NextRequest) {
  try {
    const {
      startingLocation,
      hourRange,
      numberOfPeople,
      radius,
      eventDescription,
    } = await request.json();

    console.log("📍 Received request:", {
      startingLocation,
      hourRange,
      numberOfPeople,
      radius,
      eventDescription,
    });

    // Validate required inputs
    if (!startingLocation?.location?.lat || !startingLocation?.location?.lng) {
      return NextResponse.json(
        { success: false, error: "Starting location is required" },
        { status: 400 }
      );
    }

    console.log("🎯 Starting event plan generation workflow...");

    // Step 1: Search for nearby places using Google Places API
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

    console.log(`🔍 Found ${placesData.length} places in the area`);
    console.log("PlacesData:", placesData);

    // Step 2: Save places data to JSON file
    const timestamp = Date.now();
    const fileName = `event-plan-places-${timestamp}.json`;
    const placeDataStructure = {
      timestamp,
      searchLocation: startingLocation.location,
      searchRadius: radius,
      placeType: "event-planning",
      eventParameters: {
        hourRange,
        numberOfPeople,
        eventDescription,
        startingLocation,
      },
      searchMetadata: {
        totalFound: placesData.length,
        searchedAt: new Date().toISOString(),
        radiusMeters: radius,
      },
      places: placesData,
    };

    const filePath = path.join(process.cwd(), "api_logs", fileName);
    await writeFile(filePath, JSON.stringify(placeDataStructure, null, 2));

    console.log(`💾 Saved places data to ${fileName}`);

    const eventPlan = await generateEventPlanWithGemini({
      places: placesData,
      hourRange,
      numberOfPeople,
      eventDescription,
      startingLocation,
    });

    console.log("🤖 Generated event plan with Gemini");

    // Step 4: Extract planned locations for map display
    const plannedLocations = extractLocationsFromPlan(eventPlan, placesData);

    return NextResponse.json({
      success: true,
      eventPlan,
      plannedLocations,
      placesFound: placesData.length,
      fileName,
      metadata: {
        timestamp,
        searchLocation: startingLocation.location,
        radius,
        eventParameters: {
          hourRange,
          numberOfPeople,
          eventDescription,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error in event plan generation:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate event plan. Please try again.",
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

    // Import Google Places library (this is server-side, so we use a different approach)
    // For server-side implementation, we'll call the Places API directly via HTTP
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("Google Maps API key not configured");
    }

    const allPlaces = [];

    // Search for each place type separately to ensure we get results for each category
    for (const placeType of params.placeTypes) {
      try {
        // Use the simpler Nearby Search endpoint that's more reliable
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
              // Determine the primary place type for display
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

        // Add a small delay between searches to avoid rate limiting
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

// Helper function to generate event plan with Gemini
async function generateEventPlanWithGemini(params: {
  places: any[];
  hourRange: number;
  numberOfPeople: number;
  eventDescription: string;
  startingLocation: any;
}) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ Gemini API key not found in environment variables");
      // Return a fallback plan instead of failing
      return generateFallbackPlan(params);
    }

    const eventPlanPrompt = `
You are an expert event planner. Create a detailed, personalized event plan using the provided place data.

EVENT REQUIREMENTS:
- Duration: ${params.hourRange} hours
- Group Size: ${params.numberOfPeople} people
- Event Description: ${params.eventDescription}
- Starting Location: ${params.startingLocation.location.lat}, ${
      params.startingLocation.location.lng
    }

AVAILABLE PLACES DATA:
${JSON.stringify(params.places, null, 2)}

Please create a comprehensive event plan that includes:

1. **Event Overview**: Brief description of the planned event based on the description provided
2. **Detailed Itinerary**: Hour-by-hour schedule with specific venues from the provided data (use numbered format like "1. Venue Name", "2. Venue Name", etc.)
3. **Venue Details**: For each location, include:
   - Exact name and address from the data
   - Why it was chosen (based on ratings, type, etc.)
   - Estimated time to spend there
   - What to do/eat there
4. **Travel Route**: Logical sequence of locations to minimize travel time
5. **Timeline**: Realistic schedule that fits within ${params.hourRange} hours
6. **Group Considerations**: Activities suitable for ${
      params.numberOfPeople
    } people
7. **Backup Options**: Alternative venues in case primary choices are unavailable

IMPORTANT: 
- Use ONLY the places provided in the data
- Include specific names and addresses exactly as provided
- Use numbered format for venues (1. Venue Name, 2. Venue Name, etc.)
- Mention venue names clearly and exactly as they appear in the data
- Create a realistic timeline that accounts for travel between locations
- Make the plan engaging and tailored to the event description: "${
      params.eventDescription
    }"

Format the response in a clear, easy-to-read structure with proper headings and bullet points.
`;

    console.log("🤖 Calling Gemini API...");

    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "You are an expert event planner with deep knowledge of creating memorable experiences using specific venues and logistics."
            }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: eventPlanPrompt }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 3000,
            temperature: 0.7
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE"
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Gemini API error: ${response.status} - ${errorText}`);

      // Handle specific error cases
      if (response.status === 401) {
        console.error("❌ Gemini API authentication failed - check API key");
        return generateFallbackPlan(params);
      } else if (response.status === 429) {
        console.error("❌ Gemini API rate limited - too many requests");
        return generateFallbackPlan(params);
      }

      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Extract response text from Gemini's structure
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      console.error("❌ Invalid Gemini API response format:", result);
      return generateFallbackPlan(params);
    }

    console.log("✅ Gemini API call successful");
    return responseText;
  } catch (error) {
    console.error("❌ Error in Gemini API call:", error);

    // If network error, provide fallback plan
    if (
      error instanceof Error &&
      (error.message.includes("fetch") ||
        error.message.includes("network") ||
        error.message.includes("ENOTFOUND") ||
        error.message.includes("timeout"))
    ) {
      console.log("🔄 Network error detected, providing fallback plan");
      return generateFallbackPlan(params);
    }

    throw error;
  }
}

// Fallback function to generate a basic plan when DeepSeek API is unavailable
function generateFallbackPlan(params: {
  places: any[];
  hourRange: number;
  numberOfPeople: number;
  eventDescription: string;
  startingLocation: any;
}): string {
  console.log("🔄 Generating fallback event plan...");

  const { places, hourRange, numberOfPeople, eventDescription } = params;

  // Sort places by rating (if available) and type diversity
  const restaurants = places
    .filter((p) => p.placeType === "restaurant")
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const parks = places
    .filter((p) => p.placeType === "park")
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const clubs = places
    .filter((p) => p.placeType === "club")
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const selectedPlaces = [];

  // Select best places based on event duration
  if (hourRange >= 3 && restaurants.length > 0)
    selectedPlaces.push(restaurants[0]);
  if (hourRange >= 2 && parks.length > 0) selectedPlaces.push(parks[0]);
  if (hourRange >= 4 && clubs.length > 0) selectedPlaces.push(clubs[0]);

  // If no places selected, use any available
  if (selectedPlaces.length === 0 && places.length > 0) {
    selectedPlaces.push(places[0]);
  }

  return `
# 🎉 ${eventDescription || "Your Event"} Plan

**⚠️ Note: This plan was generated using fallback logic due to AI service limitations. For best results, please ensure your DeepSeek API key is configured.**

## Event Overview
Duration: ${hourRange} hours | Group Size: ${numberOfPeople} people
Event Theme: ${eventDescription || "General event"}

## Suggested Itinerary

${selectedPlaces
  .map(
    (place, index) => `
### ${index + 1}. ${place.displayName || place.name}
- **Address**: ${
      place.formattedAddress || place.address || "Address not available"
    }
- **Type**: ${
      place.placeType.charAt(0).toUpperCase() + place.placeType.slice(1)
    }
- **Rating**: ${place.rating ? `⭐ ${place.rating}` : "Not rated"}
- **Estimated Time**: ${Math.floor(
      hourRange / Math.max(selectedPlaces.length, 1)
    )} hour(s)

**Why this location**: ${
      place.rating
        ? `Highly rated (${place.rating} stars)`
        : "Selected based on location and type"
    }
`
  )
  .join("")}

## 📍 Total Places Found
Found ${places.length} venues in your area:
- ${restaurants.length} restaurants
- ${parks.length} parks  
- ${clubs.length} entertainment venues

## 💡 Tips
- Call ahead to confirm hours and availability
- Consider transportation between venues
- Allow extra time for ${numberOfPeople} people in your group
- Have backup options ready

**🔧 Technical Note**: This is a simplified plan. For AI-powered personalized recommendations, please configure your DeepSeek API key in the environment variables.
`;
}

// Helper function to extract locations from the generated plan with ordering
function extractLocationsFromPlan(eventPlan: string, placesData: any[]) {
  try {
    // Extract mentioned place names from the plan and match them to the places data
    const plannedLocations = [];
    const planLower = eventPlan.toLowerCase();

    // Create array of matches with their position in the plan text
    const matches = [];

    for (const place of placesData) {
      const placeNameLower = place.displayName.toLowerCase();
      const position = planLower.indexOf(placeNameLower);

      if (position !== -1) {
        matches.push({
          place,
          position,
          data: {
            id: place.id,
            name: place.displayName,
            location: place.location,
            type: place.placeType,
            tags: place.types,
            formatted_address: place.formattedAddress,
            rating: place.rating,
            user_rating_total: place.userRatingCount,
            price_level: place.priceLevel,
          },
        });
      }
    }

    // Sort by position in the plan text (earliest mention first)
    matches.sort((a, b) => a.position - b.position);

    // Add order number to each location
    const orderedLocations = matches.map((match, index) => ({
      ...match.data,
      order: index + 1, // 1-based numbering
    }));
    console.log("OrderedLocations:", orderedLocations);

    return orderedLocations;
  } catch (error) {
    console.error("Error extracting locations from plan:", error);
    return [];
  }
}









