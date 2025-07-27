import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

// Available place types from Google Places API
const AVAILABLE_PLACE_TYPES = [
  'accounting', 'airport', 'amusement_park', 'aquarium', 'art_gallery', 'atm', 'bakery', 'bank', 'bar', 'beauty_salon',
  'bicycle_store', 'book_store', 'bowling_alley', 'bus_station', 'cafe', 'campground', 'car_dealer', 'car_rental',
  'car_repair', 'car_wash', 'casino', 'cemetery', 'church', 'city_hall', 'clothing_store', 'convenience_store',
  'courthouse', 'dentist', 'department_store', 'doctor', 'drugstore', 'electrician', 'electronics_store', 'embassy',
  'fire_station', 'florist', 'funeral_home', 'furniture_store', 'gas_station', 'gym', 'hair_care', 'hardware_store',
  'hindu_temple', 'home_goods_store', 'hospital', 'insurance_agency', 'jewelry_store', 'laundry', 'lawyer', 'library',
  'light_rail_station', 'liquor_store', 'local_government_office', 'locksmith', 'lodging', 'meal_delivery',
  'meal_takeaway', 'mosque', 'movie_rental', 'movie_theater', 'moving_company', 'museum', 'night_club', 'painter',
  'park', 'parking', 'pet_store', 'pharmacy', 'physiotherapist', 'plumber', 'police', 'post_office', 'primary_school',
  'real_estate_agency', 'restaurant', 'roofing_contractor', 'rv_park', 'school', 'secondary_school', 'shoe_store',
  'shopping_mall', 'spa', 'stadium', 'storage', 'store', 'subway_station', 'supermarket', 'synagogue', 'taxi_stand',
  'tourist_attraction', 'train_station', 'transit_station', 'travel_agency', 'university', 'veterinary_care', 'zoo'
];

export async function POST(request: NextRequest) {
  try {
    const {
      startingLocation,
      hourRange,
      numberOfPeople,
      radius,
      ageRange,
      budget,
      eventDate,
      startTime,
      endTime,
      eventDescription
    } = await request.json();

    console.log("📍 Received request:", {
      startingLocation,
      hourRange,
      numberOfPeople,
      radius,
      ageRange,
      budget,
      eventDate,
      startTime,
      endTime,
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

    // Step 1: Dynamically select place types based on event description
    let selectedPlaceTypes: string[];
    try {
      selectedPlaceTypes = await selectPlaceTypesWithGemini(eventDescription);
      console.log(`🤖 Gemini selected place types: ${selectedPlaceTypes.join(', ')}`);
    } catch (error) {
      console.warn("❌ Failed to select place types with Gemini, using defaults:", error);
      selectedPlaceTypes = ["restaurant", "park", "tourist_attraction"];
    }

    // Step 1 (continued): Search for nearby places using the AI-selected types
    const placesData = await searchNearbyPlaces({
      latitude: startingLocation.location.lat,
      longitude: startingLocation.location.lng,
      radiusInMeters: radius || 1000,
      placeTypes: selectedPlaceTypes,
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
    const fileName = `event-plan-places-${timestamp}.json`;
    const placeDataStructure = {
      timestamp,
      searchLocation: startingLocation.location,
      searchRadius: radius,
      placeType: 'event-planning',
      eventParameters: {
        hourRange,
        numberOfPeople,
        ageRange,
        budget,
        eventDate,
        startTime,
        endTime,
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

    console.log(`📊 Original places data: ${placesData.length} places`);
    console.log(`📝 Sample places:`, placesData.slice(0, 3).map(p => ({ name: p.displayName, type: p.placeType })));

    const filteredPlaces = await filterPlacesWithGemini({
      places: placesData,
      eventDescription,
      location: startingLocation.location,
      ageRange,
      budget,
      eventDate,
      startTime,
      endTime,
    });
    console.log(`🔍 Gemini filtered ${filteredPlaces.length} places from ${placesData.length}`);

    let eventPlan;
    if (filteredPlaces.length === 0) {
      console.warn("⚠️ No places passed the Gemini filter, using original places for event planning");
      // Use original places if filtering removed everything
      eventPlan = await generateEventPlanWithGemini({
        places: placesData.slice(0, 8), // Use first 8 places as fallback
        hourRange,
        numberOfPeople,
        eventDescription,
        startingLocation,
      });
    } else {
      eventPlan = await generateEventPlanWithGemini({
        places: filteredPlaces,
        hourRange,
        numberOfPeople,
        eventDescription,
        startingLocation,
      });
    }






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
          eventDate,
          startTime,
          endTime,
          ageRange,
          budget,
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



async function filterPlacesWithGemini(params: {
  places: any[];
  eventDescription: string;
  location: { lat: number; lng: number };
  ageRange: [number, number];
  budget: number;
  eventDate: string;
  startTime: string;
  endTime: string;
}) {
  const { places, eventDescription, location, ageRange, budget, eventDate, startTime, endTime } = params;

  console.log(`🔍 Starting Gemini filtering with ${places.length} places`);
  console.log(`📋 Filter criteria: age ${ageRange[0]}-${ageRange[1]}, budget $${budget}, event: "${eventDescription}"`);

  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY not found, skipping filtering - returning all places");
    return places;
  }

  const filterPrompt = `
You are a location-aware event assistant. 
Filter places based on these criteria:


- Age Range: ${ageRange[0]} - ${ageRange[1]} years.
- Budget: up to ${budget}.
- Event Date: ${eventDate}
- Start Time: ${startTime}
- End Time: ${endTime}
- Event Description: "${eventDescription}".


Rules:
- Remove places inappropriate for children if age < 18 (e.g., night clubs).
- Choose 3–8 diverse, relevant venues.

Available places:
${JSON.stringify(places.slice(0, 15), null, 2)} (first 15 shown)

Return JSON array of IDs like:
[ { "id": "place_id_1" }, { "id": "place_id_2" } ]
`;

  const apiKey = process.env.GEMINI_API_KEY;
  const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: filterPrompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.4,
          },
        }),
      }
  );

  if (!response.ok) throw new Error(`Gemini filtering failed: ${response.status}`);

  const result = await response.json();
  const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  let filtered;
  try {
    filtered = JSON.parse(rawText);
  } catch (e) {
    console.warn("Gemini returned non-JSON output:", rawText);
    filtered = [];
  }

  const allowedIds = new Set(filtered.map((p: any) => p.id));
  const filteredPlaces = places.filter((p) => allowedIds.has(p.id));

  console.log(`✅ Gemini filtering complete: ${filteredPlaces.length} places selected from ${places.length}`);
  console.log(`📍 Selected places:`, filteredPlaces.map(p => ({ name: p.displayName, type: p.placeType })));

  return filteredPlaces;
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
    console.log(`🤖 Starting Gemini event plan generation with ${params.places.length} places`);
    console.log(`📍 Places being sent to AI:`, params.places.map(p => ({
      name: p.displayName,
      type: p.placeType,
      rating: p.rating,
      address: p.formattedAddress
    })));

    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI API key not found in environment variables');
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
- Make the plan engaging and tailored to the event description: "${
        params.eventDescription
    }"
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
              temperature: 0.7,
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
    console.log(`📥 Gemini API response received. Response structure:`, Object.keys(result));

    // Extract response text from Gemini's structure
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.error("❌ Invalid Gemini API response format:", result);
      console.error("❌ Full response:", JSON.stringify(result, null, 2));
      return generateFallbackPlan(params);
    }

    console.log("✅ Gemini API call successful");
    console.log(`📄 Generated event plan preview: ${responseText.substring(0, 200)}...`);
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

// Fallback function to generate a basic plan when GEMINI API is unavailable
function generateFallbackPlan(params: {
  places: any[];
  hourRange: number;
  numberOfPeople: number;
  eventDescription: string;
  startingLocation: any;
}): string {
  console.log("🔄 Generating fallback event plan...");

  const { places, hourRange, numberOfPeople, eventDescription,  } = params;

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

  return `Here's your ${hourRange}-hour ${eventDescription || "event"} plan for ${numberOfPeople} people. This plan includes the best-rated venues in your area, organized for optimal travel flow. Each location has been selected based on its ratings and suitability for your group.

${selectedPlaces
      .map(
          (place, index) => `${index + 1}. ${place.displayName || place.name} - ${
              place.formattedAddress || place.address || "Address not available"
          }
   ${place.rating
              ? `Highly rated venue (${place.rating} stars) perfect for ${place.placeType} activities`
              : `Selected ${place.placeType} venue based on location and type`}
   Estimated time: ${Math.floor(
              hourRange / Math.max(selectedPlaces.length, 1)
          )} hour(s)

`
      )
      .join("")}You can choose to edit your plan or make another one!`;
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


async function selectPlaceTypesWithGemini(params: {
  eventDescription: string;
  ageRange: [number, number];
  budget: number;
  eventDate: string;
  startTime: string;
  endTime: string;
}): Promise<string[]> {
  const { eventDescription, ageRange, budget, eventDate, startTime, endTime } = params;

  console.log(`🤖 Selecting place types for event: "${eventDescription}"`);
  console.log(`📋 Criteria: age ${ageRange[0]}-${ageRange[1]}, budget $${budget}, date ${eventDate}, time ${startTime}-${endTime}`);

  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY not found, using default place types");
    return ["restaurant", "park", "tourist_attraction"];
  }

  const prompt = `
You are an intelligent event assistant. Based on the event details, pick 3–8 relevant Google Places API place types from the list below.

Event Details:
- Age Range: ${ageRange[0]}-${ageRange[1]} years
- Budget: up to $${budget}
- Event Date: ${eventDate}
- Time: ${startTime} - ${endTime}
- Description: "${eventDescription}"

Rules:
- Avoid adult-only venues (e.g., bars, casinos, night_clubs) if the age range includes children < 18.
- Include dining-related places ("restaurant", "cafe", "bakery") if the event suggests eating out.
- Include entertainment (e.g., "movie_theater", "bowling_alley", "amusement_park") for fun events.
- Include cultural locations (e.g., "museum", "art_gallery", "library") if the event mentions culture or history.
- Include outdoor places (e.g., "park", "zoo") for family or nature events.
- Choose types that are realistic for the given budget.
- Select 3–8 relevant types, ensuring diversity.

Available Google Place Types:
${AVAILABLE_PLACE_TYPES.join(', ')}

Return a JSON array of place type strings, for example:
["restaurant", "park", "museum"]
`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 150, temperature: 0.4 },
          }),
        }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.status} - ${errorText}`);
      throw new Error(`Gemini place type selection failed: ${response.status}`);
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    let selectedTypes: string[];
    try {
      selectedTypes = JSON.parse(rawText);
      if (!Array.isArray(selectedTypes)) throw new Error("Invalid format");
    } catch (e) {
      console.warn("Gemini returned invalid or non-JSON output:", rawText);
      selectedTypes = ["restaurant", "park", "tourist_attraction"];
    }

    // Filter invalid types
    const validSelectedTypes = selectedTypes.filter(type =>
        AVAILABLE_PLACE_TYPES.includes(type)
    );

    if (validSelectedTypes.length === 0) {
      console.warn("Gemini returned no valid types, using defaults");
      return ["restaurant", "park", "tourist_attraction"];
    }

    // Ensure max 8 types
    const uniqueTypes = Array.from(new Set(validSelectedTypes)).slice(0, 8);

    console.log(`Gemini selected place types: ${uniqueTypes.join(', ')}`);
    return uniqueTypes;

  } catch (error) {
    console.error("Error in place type selection:", error);
    return ["restaurant", "park", "tourist_attraction"];
  }
}

