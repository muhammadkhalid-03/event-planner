import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { 
      startingLocation, 
      hourRange, 
      numberOfPeople, 
      radius,
      ageRange,
      budget,
      eventDescription,
      numberOfRoutes = 3 // Default to 3 routes
    } = await request.json();

    console.log("📍 Received multiple routes request:", {
      startingLocation,
      hourRange,
      numberOfPeople,
      radius,
      ageRange,
      budget,
      eventDescription,
      numberOfRoutes,
    });

    // Validate required inputs
    if (!startingLocation?.location?.lat || !startingLocation?.location?.lng) {
      return NextResponse.json(
        { success: false, error: "Starting location is required" },
        { status: 400 }
      );
    }

    console.log("🎯 Starting multiple routes generation workflow...");

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

    // Step 2: Save places data to JSON file
    const timestamp = Date.now();
    const fileName = `multiple-routes-places-${timestamp}.json`;
    const placeDataStructure = {
      timestamp,
      searchLocation: startingLocation.location,
      searchRadius: radius,
      placeType: 'multiple-routes-planning',
      eventParameters: {
        hourRange,
        numberOfPeople,
        ageRange,
        budget,
        eventDescription,
        startingLocation
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

    // Step 3: Generate multiple different route options
    const routes = [];
    
    for (let i = 0; i < numberOfRoutes; i++) {
      console.log(`🛣️ Generating route option ${i + 1}/${numberOfRoutes}...`);
      
      // Create different filtering strategies for variety
      const filterStrategy = i % 3; // 3 different strategies
      let filteredPlaces: any[];
      
      switch (filterStrategy) {
        case 0:
          // Strategy 1: Focus on high-rated places
          filteredPlaces = placesData
            .filter(p => p.rating && p.rating >= 4.0)
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 8);
          break;
        case 1:
          // Strategy 2: Focus on diverse place types
          const restaurants = placesData.filter(p => p.placeType === "restaurant").slice(0, 3);
          const parks = placesData.filter(p => p.placeType === "park").slice(0, 2);
          const clubs = placesData.filter(p => p.placeType === "club").slice(0, 2);
          filteredPlaces = [...restaurants, ...parks, ...clubs];
          break;
        case 2:
          // Strategy 3: Budget-focused (lower price levels)
          filteredPlaces = placesData
            .filter(p => !p.priceLevel || p.priceLevel <= 2)
            .sort((a, b) => (a.priceLevel || 0) - (b.priceLevel || 0))
            .slice(0, 8);
          break;
        default:
          filteredPlaces = placesData.slice(0, 8);
      }

      // If filtering resulted in too few places, add some from the original list
      if (filteredPlaces.length < 3) {
        const additionalPlaces = placesData
          .filter(p => !filteredPlaces.find(fp => fp.id === p.id))
          .slice(0, 5);
        filteredPlaces = [...filteredPlaces, ...additionalPlaces];
      }

      // Generate event plan for this route
      const eventPlan = await generateEventPlanWithGemini({
        places: filteredPlaces,
        hourRange,
        numberOfPeople,
        eventDescription,
        startingLocation,
        routeNumber: i + 1,
        totalRoutes: numberOfRoutes,
      });

      // Extract planned locations for this route
      const plannedLocations = extractLocationsFromPlan(eventPlan, placesData);

      // Create route data
      const routeData = {
        startingLocation,
        hourRange,
        numberOfPeople,
        radius,
        ageRange,
        budget,
        eventDescription,
        suggestedPlan: eventPlan,
        plannedLocations,
        placesFound: placesData.length,
        routeNumber: i + 1,
        routeName: getRouteName(i + 1, filterStrategy),
        metadata: {
          timestamp,
          searchLocation: startingLocation.location,
          radius,
          eventParameters: {
            hourRange,
            numberOfPeople,
            eventDescription,
          },
          filterStrategy,
        },
      };

      routes.push(routeData);
      
      // Add delay between API calls to avoid rate limiting
      if (i < numberOfRoutes - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Generated ${routes.length} different route options`);

    return NextResponse.json({
      success: true,
      routes,
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
    console.error("❌ Error in multiple routes generation:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate multiple routes. Please try again.",
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

// Helper function to generate event plan with Gemini
async function generateEventPlanWithGemini(params: {
  places: any[];
  hourRange: number;
  numberOfPeople: number;
  eventDescription: string;
  startingLocation: any;
  routeNumber: number;
  totalRoutes: number;
}) {
  try {
    console.log(`🤖 Starting Gemini event plan generation for route ${params.routeNumber}/${params.totalRoutes}`);

    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI API key not found in environment variables');
      return generateFallbackPlan(params);
    }

    const routeName = getRouteName(params.routeNumber, (params.routeNumber - 1) % 3);
    
    const eventPlanPrompt = `
You are an expert event planner. Create a detailed, personalized event plan using the provided place data.

This is route option ${params.routeNumber} of ${params.totalRoutes} - make it unique and different from other options!

EVENT REQUIREMENTS:
- Duration: ${params.hourRange} hours
- Group Size: ${params.numberOfPeople} people
- Event Description: ${params.eventDescription}
- Starting Location: ${params.startingLocation.location.lat}, ${params.startingLocation.location.lng}
- Route Style: ${routeName}

AVAILABLE PLACES DATA:
${JSON.stringify(params.places, null, 2)}

IMPORTANT FORMATTING REQUIREMENTS:
- DO NOT use any hashtags (#), asterisks (*), or any markdown formatting
- DO NOT use bullet points with dashes (-) or asterisks (*)
- Use plain text only
- Follow this exact format:

FORMAT:
Start with a 2-3 line description of the evening events.

Then list all events in this format:
1. Venue Name - Address
   Why this location and what to do here
   Estimated time: X hours

2. Venue Name - Address  
   Why this location and what to do here
   Estimated time: X hours

End with: "I have made 3 different plans and you can edit each one. I can make more plans if needed."

REQUIREMENTS: 
- Use ONLY the places provided in the data
- Include specific names and addresses exactly as provided
- Use numbered format for venues (1., 2., 3., etc.)
- Mention venue names clearly and exactly as they appear in the data
- Create a realistic timeline that accounts for travel between locations
- Make this route unique and different from other options
- Focus on the ${routeName} style for this route
- NO hashtags, asterisks, dashes, or any markdown formatting
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
            parts: [
              {
                text: "You are an expert event planner with deep knowledge of creating memorable experiences using specific venues and logistics.",
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: eventPlanPrompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 3000,
            temperature: 0.8, // Slightly higher temperature for more variety
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE",
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Gemini API error: ${response.status} - ${errorText}`);
      return generateFallbackPlan(params);
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.error("❌ Invalid Gemini API response format:", result);
      return generateFallbackPlan(params);
    }

    console.log("✅ Gemini API call successful");
    return responseText;
  } catch (error) {
    console.error("❌ Error in Gemini API call:", error);
    return generateFallbackPlan(params);
  }
}

// Helper function to get route name based on route number and strategy
function getRouteName(routeNumber: number, strategy: number): string {
  const strategyNames = [
    "Premium Experience", // High-rated places
    "Diverse Adventure",  // Mixed place types
    "Budget-Friendly"     // Lower price levels
  ];
  
  return `${strategyNames[strategy]} - Option ${routeNumber}`;
}

// Fallback function to generate a basic plan when GEMINI API is unavailable
function generateFallbackPlan(params: {
  places: any[];
  hourRange: number;
  numberOfPeople: number;
  eventDescription: string;
  startingLocation: any;
  routeNumber: number;
  totalRoutes: number;
}): string {
  console.log("🔄 Generating fallback event plan...");

  const { places, hourRange, numberOfPeople, eventDescription, routeNumber, totalRoutes } = params;
  const routeName = getRouteName(routeNumber, (routeNumber - 1) % 3);

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
# 🎉 ${eventDescription || "Your Event"} Plan - ${routeName}

**⚠️ Note: This plan was generated using fallback logic due to AI service limitations. For best results, please ensure your Gemini API key is configured.**

## Event Overview
Duration: ${hourRange} hours | Group Size: ${numberOfPeople} people
Event Theme: ${eventDescription || "General event"}
Route Style: ${routeName}

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

**🔧 Technical Note**: This is a simplified plan. For AI-powered personalized recommendations, please configure your Gemini API key in the environment variables.
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