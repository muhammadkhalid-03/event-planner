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
      eventDate,
      startTime,
      endTime,
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

    // Step 1: Dynamically select place types based on event description
    let selectedPlaceTypes: string[];
    try {
      selectedPlaceTypes = await selectPlaceTypesWithGemini(eventDescription);
      console.log(`🤖 Gemini selected place types for multiple routes: ${selectedPlaceTypes.join(', ')}`);
      
      // Additional validation - ensure no empty results
      if (!selectedPlaceTypes || selectedPlaceTypes.length === 0) {
        console.warn("⚠️ Gemini returned empty place types array, using generic defaults");
        selectedPlaceTypes = ["tourist_attraction", "park", "museum"];
      }
    } catch (error) {
      console.error("❌ Failed to select place types with Gemini:", error);
      // Use more diverse defaults instead of restaurant-heavy ones
      selectedPlaceTypes = ["tourist_attraction", "park", "museum"];
      console.log(`🔄 Using fallback place types: ${selectedPlaceTypes.join(', ')}`);
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

    // Step 3: Generate multiple different route options
    const routes = [];
    
    for (let i = 0; i < numberOfRoutes; i++) {
      console.log(`🛣️ Generating route option ${i + 1}/${numberOfRoutes}...`);
      
      // Create different filtering strategies for variety
      const filterStrategy = i % 3; // 3 different strategies
      let filteredPlaces: any[];
      
      // Get unique place types from the data
      const availablePlaceTypes = Array.from(new Set(placesData.map(p => p.placeType)));
      console.log(`📋 Available place types for route ${i + 1}:`, availablePlaceTypes);
      
      switch (filterStrategy) {
        case 0:
          // Strategy 1: Focus on high-rated places across all types
          filteredPlaces = placesData
            .filter(p => p.rating && p.rating >= 4.0)
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 8);
          break;
        case 1:
          // Strategy 2: Focus on diverse place types (ensure variety)
          const placesByType: { [key: string]: any[] } = {};
          
          // Group places by type
          placesData.forEach(place => {
            if (!placesByType[place.placeType]) {
              placesByType[place.placeType] = [];
            }
            placesByType[place.placeType].push(place);
          });
          
          // Take top-rated places from each type
          filteredPlaces = [];
          availablePlaceTypes.forEach(type => {
            const placesOfType = placesByType[type]
              ?.sort((a, b) => (b.rating || 0) - (a.rating || 0))
              .slice(0, 3) || [];
            filteredPlaces.push(...placesOfType);
          });
          
          // Limit total to 8 places, prioritizing variety
          if (filteredPlaces.length > 8) {
            // Take at least one from each type, then fill remaining slots with highest rated
            const oneFromEach = availablePlaceTypes.map(type => 
              placesByType[type]?.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]
            ).filter(Boolean);
            
            const remaining = filteredPlaces
              .filter(p => !oneFromEach.find(oe => oe.id === p.id))
              .sort((a, b) => (b.rating || 0) - (a.rating || 0))
              .slice(0, 8 - oneFromEach.length);
              
            filteredPlaces = [...oneFromEach, ...remaining];
          }
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

      // CRITICAL: Remove any duplicates from filtered places based on place ID
      filteredPlaces = filteredPlaces.filter(
        (place, index, self) => index === self.findIndex((p) => p.id === place.id)
      );

      // If filtering resulted in too few places, add some from the original list
      if (filteredPlaces.length < 3) {
        const additionalPlaces = placesData
          .filter(p => !filteredPlaces.find(fp => fp.id === p.id))
          .slice(0, 5);
        filteredPlaces = [...filteredPlaces, ...additionalPlaces];
        
        // Final deduplication after adding additional places
        filteredPlaces = filteredPlaces.filter(
          (place, index, self) => index === self.findIndex((p) => p.id === place.id)
        );
      }

      console.log(`✅ Final filtered places for route ${i + 1}: ${filteredPlaces.length} unique venues`);

      // Generate event plan for this route
      const eventPlan = await generateEventPlanWithGemini({
        places: filteredPlaces,
        hourRange,
        numberOfPeople,
        eventDescription,
        startingLocation,
        routeNumber: i + 1,
        totalRoutes: numberOfRoutes,
        budget,
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
        eventDate,
        startTime,
        endTime,
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
            eventDate,
            startTime,
            endTime,
            ageRange,
            budget,
          },
          filterStrategy,
          selectedPlaceTypes,
          availablePlaceTypes,
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
          eventDate,
          startTime,
          endTime,
          ageRange,
          budget,
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
              // Use the actual place type from Google Places API instead of hardcoding
              const primaryType = placeType; // Use the search type as the primary type
              
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
                placeType: primaryType, // This now reflects the actual AI-selected type
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
  budget?: number;
}) {
  try {
    console.log(`🤖 Starting Gemini event plan generation for route ${params.routeNumber}/${params.totalRoutes}`);

    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI API key not found in environment variables');
      return generateFallbackPlan(params);
    }

    const routeName = getRouteName(params.routeNumber, (params.routeNumber - 1) % 3);
    
    // IMPROVED PROMPT WITH SYSTEM INSTRUCTIONS
    const systemInstruction = {
      parts: [
        {
          text: `You are an expert travel planner specializing in creating practical, budget-conscious itineraries. Your expertise includes:
          - Analyzing location data for optimal routing and timing
          - Budget estimation based on local price levels
          - Cultural and experiential insights
          - Logistical optimization for group travel
          
          Always prioritize feasibility over idealism, ensuring all recommendations are practical and achievable within given constraints.`
        }
      ]
    };

    const eventPlanPrompt = `
# TRAVEL PLANNING TASK

## ROUTE CONTEXT
Route ${params.routeNumber} of ${params.totalRoutes} - Style: ${routeName}
Make this route distinctly different from other options by emphasizing ${getRouteStyleDescription(routeName)}.

## INPUT PARAMETERS
- **Duration**: ${params.hourRange} hours total
- **Group Size**: ${params.numberOfPeople} people  
- **Event Type**: ${params.eventDescription}
- **Budget**: ${params.budget ? `$${params.budget} USD per person (total budget: $${params.budget * params.numberOfPeople} for ${params.numberOfPeople} people)` : 'Budget not specified - provide cost estimates'}
- **Starting Point**: Coordinates ${params.startingLocation.location.lat}, ${params.startingLocation.location.lng}
- **Available Locations**: 
${JSON.stringify(params.places, null, 2)}

## PLANNING REQUIREMENTS

### 1. CONSTRAINT ANALYSIS
Before creating the itinerary, analyze:
- Travel distances between locations (estimate travel times)
- Price levels for dining/activities based on location data
- Opening hours and availability
- Group logistics for ${params.numberOfPeople} people

### 2. ROUTE OPTIMIZATION  
- Minimize unnecessary travel between distant locations
- Consider traffic patterns and transit efficiency
- Allocate realistic time buffers between activities
- Plan for group coordination needs

### 3. BUDGET CONSCIOUSNESS
- Prioritize venues with appropriate price points for the ${params.budget ? `$${params.budget} per person budget` : 'specified budget range'}
- ${params.budget ? `Ensure estimated costs stay within $${params.budget} per person (total group budget: $${params.budget * params.numberOfPeople})` : 'Suggest cost-effective alternatives when available'}
- Consider group discounts but maintain per-person budget of ${params.budget ? `$${params.budget}` : 'specified amount'}
- ${params.budget ? `Calculate costs per person to stay within the $${params.budget} individual budget` : 'Estimate total approximate costs per person'}

## OUTPUT FORMAT
Respond ONLY with a JSON object following this exact structure:

{
  "routeDescription": "2-3 sentence overview emphasizing the ${routeName} style",
  "estimatedBudgetPerPerson": "numerical estimate in local currency",
  "totalTravelTime": "estimated time spent in transit",
  "itinerary": [
    {
      "sequence": 1,
      "venueName": "exact name from location data", 
      "address": "exact address from location data",
      "arrivalTime": "suggested time (HH:MM format)",
      "duration": "time to spend here (in minutes)",
      "description": "why this venue fits the ${routeName} style and what to do here",
      "estimatedCost": "approximate cost per person",
      "travelToNext": "estimated travel time to next location (minutes)",
      "travelMethod": "recommended transportation method"
    }
  ],
  "alternativeOptions": [
    {
      "venueName": "backup option from available data",
      "reason": "why this could substitute if needed"
    }
  ],
  "practicalTips": [
    "specific advice for this route and group size"
  ],
  "conclusion": "I have created 3 different route options and you can edit each one. I can generate additional plans if needed."
}

## CRITICAL INSTRUCTIONS
1. Use ONLY venues from the provided location data
2. Ensure total planned time does not exceed ${params.hourRange} hours
3. Verify venue names and addresses match the provided data exactly
4. Calculate realistic travel times between locations
5. Consider ${params.numberOfPeople} people for all logistics and costs
6. ${params.budget ? `**STAY WITHIN BUDGET**: Estimated costs must not exceed $${params.budget} per person` : 'Provide realistic cost estimates for budget planning'}
7. Make this route distinctly ${routeName}-focused compared to other options
8. Include practical considerations like bathroom breaks, meal timing, etc.
9. **NEVER include the same venue twice in the itinerary** - each venue must be unique within the plan
10. **Each venue name and address must be exactly as provided** - no variations or alternative names

Begin analysis and create the JSON response now.`;

    console.log("🤖 Calling Gemini API with improved prompt...");

    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: systemInstruction,
          contents: [
            {
              role: "user",
              parts: [{ text: eventPlanPrompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 4000,
            temperature: 0.3, // Reduced for more consistent, structured output
            topP: 0.8,
            responseMimeType: "application/json", // Force JSON output
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

    // Parse and validate JSON response
    try {
      const parsedPlan = JSON.parse(responseText);
      console.log("✅ Gemini API call successful - JSON parsed");
      
      // Convert structured JSON back to text format for compatibility with existing code
      return convertJsonPlanToText(parsedPlan);
    } catch (parseError) {
      console.error("❌ Failed to parse JSON response:", parseError);
      console.log("Raw response:", responseText);
      return generateFallbackPlan(params);
    }

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

// Helper function to describe route styles
function getRouteStyleDescription(routeName: string): string {
  const styleDescriptions: { [key: string]: string } = {
    'Premium Experience - Option 1': 'high-rated venues and luxury experiences regardless of cost',
    'Premium Experience - Option 2': 'top-tier venues with excellent ratings and premium amenities',
    'Premium Experience - Option 3': 'finest establishments with superior quality and service',
    'Diverse Adventure - Option 1': 'varied venue types for a well-rounded and eclectic experience',
    'Diverse Adventure - Option 2': 'mixed categories of attractions for maximum variety and discovery',
    'Diverse Adventure - Option 3': 'diverse activities across different venue types and experiences',
    'Budget-Friendly - Option 1': 'cost-effective venues that provide great value without compromising experience',
    'Budget-Friendly - Option 2': 'affordable options that maximize enjoyment while minimizing expenses',
    'Budget-Friendly - Option 3': 'economical choices with excellent value propositions and lower costs'
  };
  
  return styleDescriptions[routeName] || 'unique local experiences tailored to your preferences';
}

// Helper function to convert structured JSON plan back to text format for compatibility
function convertJsonPlanToText(parsedPlan: any): string {
  try {
    let textPlan = '';
    
    // Add route description
    if (parsedPlan.routeDescription) {
      textPlan += parsedPlan.routeDescription + '\n\n';
    }
    
    // Add budget and travel info if available
    if (parsedPlan.estimatedBudgetPerPerson || parsedPlan.totalTravelTime) {
      textPlan += `Budget estimate: ${parsedPlan.estimatedBudgetPerPerson || 'Not specified'} per person\n`;
      textPlan += `Total travel time: ${parsedPlan.totalTravelTime || 'Not specified'}\n\n`;
    }
    
    // Add itinerary with duplicate detection and removal
    if (parsedPlan.itinerary && Array.isArray(parsedPlan.itinerary)) {
      // Remove any duplicate venues from the itinerary as a safety check
      const seenVenues = new Set<string>();
      const uniqueItinerary = parsedPlan.itinerary.filter((item: any) => {
        const venueKey = `${item.venueName || 'Unknown'}-${item.address || ''}`.toLowerCase();
        if (seenVenues.has(venueKey)) {
          console.warn(`🚨 Duplicate venue detected and removed from itinerary: ${item.venueName}`);
          return false;
        }
        seenVenues.add(venueKey);
        return true;
      });
      
      uniqueItinerary.forEach((item: any, index: number) => {
        textPlan += `${index + 1}. ${item.venueName || 'Unknown Venue'}`;
        if (item.address) {
          textPlan += ` - ${item.address}`;
        }
        textPlan += '\n';
        
        if (item.description) {
          textPlan += `   ${item.description}\n`;
        }
        
        if (item.duration || item.estimatedCost) {
          textPlan += `   Duration: ${item.duration || 'Not specified'} minutes`;
          if (item.estimatedCost) {
            textPlan += ` | Cost: ${item.estimatedCost}`;
          }
          textPlan += '\n';
        }
        
        textPlan += '\n';
      });
      
      if (uniqueItinerary.length !== parsedPlan.itinerary.length) {
        console.log(`✅ Removed ${parsedPlan.itinerary.length - uniqueItinerary.length} duplicate venues from itinerary`);
      }
    }
    
    // Add practical tips if available
    if (parsedPlan.practicalTips && Array.isArray(parsedPlan.practicalTips) && parsedPlan.practicalTips.length > 0) {
      textPlan += 'Practical Tips:\n';
      parsedPlan.practicalTips.forEach((tip: string) => {
        textPlan += `- ${tip}\n`;
      });
      textPlan += '\n';
    }
    
    // Add conclusion
    if (parsedPlan.conclusion) {
      textPlan += parsedPlan.conclusion;
    } else {
      textPlan += 'I have created 3 different route options and you can edit each one. I can generate additional plans if needed.';
    }
    
    return textPlan;
  } catch (error) {
    console.error('Error converting JSON plan to text:', error);
    return 'Plan generated successfully but formatting error occurred. Please try regenerating the plan.';
  }
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
  budget?: number;
}): string {
  console.log("🔄 Generating fallback event plan...");

  const { places, hourRange, numberOfPeople, eventDescription, routeNumber, totalRoutes } = params;
  const routeName = getRouteName(routeNumber, (routeNumber - 1) % 3);

  // Group places by their actual types (dynamic, not hardcoded)
  const placesByType: { [key: string]: any[] } = {};
  places.forEach(place => {
    if (!placesByType[place.placeType]) {
      placesByType[place.placeType] = [];
    }
    placesByType[place.placeType].push(place);
  });

  // Sort places within each type by rating
  Object.keys(placesByType).forEach(type => {
    placesByType[type].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  });

  const selectedPlaces: any[] = [];
  const availableTypes = Object.keys(placesByType);

  // Select best places from each type, considering event duration
  if (hourRange >= 2 && availableTypes.length > 0) {
    // For longer events, try to include variety from different types
    const placesPerType = Math.max(1, Math.floor(Math.min(8, hourRange) / availableTypes.length));
    
    availableTypes.forEach(type => {
      const topPlacesOfType = placesByType[type].slice(0, placesPerType);
      selectedPlaces.push(...topPlacesOfType);
    });
  }

  // If we don't have enough places or for shorter events, just take the highest rated overall
  if (selectedPlaces.length === 0 || selectedPlaces.length < Math.min(3, hourRange)) {
    const allPlacesSorted = places.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const additionalPlaces = allPlacesSorted
      .filter(p => !selectedPlaces.find(sp => sp.id === p.id))
      .slice(0, Math.max(3, Math.min(8, hourRange)) - selectedPlaces.length);
    selectedPlaces.push(...additionalPlaces);
  }

  // Limit to reasonable number of places based on time available
  const finalPlaces = selectedPlaces.slice(0, Math.min(8, Math.max(2, hourRange)));

  return `Here's your ${hourRange}-hour ${eventDescription || "event"} plan for ${numberOfPeople} people${params.budget ? ` with a $${params.budget} per person budget` : ''}. This plan includes the best-rated venues in your area, organized for optimal travel flow. Each location has been selected based on its ratings and suitability for your group.

${params.budget ? `Budget Overview: With $${params.budget} per person budget, that's a total of $${params.budget * numberOfPeople} for your group of ${numberOfPeople} people for this ${hourRange}-hour experience.

` : ''}${finalPlaces
  .map(
    (place, index) => `${index + 1}. ${place.displayName || place.name} - ${
      place.formattedAddress || place.address || "Address not available"
    }
   ${place.rating 
     ? `Highly rated venue (${place.rating} stars) perfect for ${place.placeType} activities` 
     : `Selected ${place.placeType} venue based on location and type`}
   Estimated time: ${Math.floor(
     hourRange / Math.max(finalPlaces.length, 1)
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

    // Remove duplicates based on place ID (in case a venue is mentioned multiple times)
    const uniqueMatches = matches.filter(
      (match, index, self) => index === self.findIndex((m) => m.place.id === match.place.id)
    );

    // Add order number to each location
    const orderedLocations = uniqueMatches.map((match, index) => ({
      ...match.data,
      order: index + 1, // 1-based numbering
    }));
    
    if (uniqueMatches.length !== matches.length) {
      console.log(`✅ Removed ${matches.length - uniqueMatches.length} duplicate venue mentions from extracted locations`);
    }
    
    console.log("OrderedLocations:", orderedLocations);

    return orderedLocations;
  } catch (error) {
    console.error("Error extracting locations from plan:", error);
    return [];
  }
}

async function selectPlaceTypesWithGemini(eventDescription: string): Promise<string[]> {
  console.log(`🤖 Selecting place types for event: "${eventDescription}"`);
  
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY not found, using default place types");
    return ["tourist_attraction", "park", "museum"]; // Default to diverse types
  }

  if (!eventDescription || eventDescription.trim().length === 0) {
    console.warn("⚠️ Empty event description, using default place types");
    return ["tourist_attraction", "park", "museum"];
  }

  const prompt = `
You are an expert event planner. Analyze this event description and select the most relevant place types.

EVENT DESCRIPTION: "${eventDescription}"

AVAILABLE PLACE TYPES:
${AVAILABLE_PLACE_TYPES.join(', ')}

SELECTION RULES:
1. Choose 3-5 place types that best match the event theme and activities
2. Consider the event's purpose, target audience, and typical activities
3. For dining events: include "restaurant", "cafe", "bar" as appropriate
4. For cultural events: include "museum", "art_gallery", "library", "tourist_attraction"
5. For entertainment: include "amusement_park", "bowling_alley", "movie_theater", "night_club"
6. For outdoor activities: include "park", "zoo", "stadium", "campground"
7. For shopping: include "shopping_mall", "store", "book_store", "clothing_store"
8. For wellness: include "spa", "gym", "beauty_salon"
9. For family events: avoid adult-only venues like "night_club", "bar", "casino"
10. For business events: include "restaurant", "hotel", "conference_center" type venues

EXAMPLES:
- "romantic date night" → ["restaurant", "park", "art_gallery", "movie_theater", "bar"]
- "kids birthday party" → ["amusement_park", "restaurant", "park", "zoo", "bowling_alley"]
- "business networking" → ["restaurant", "bar", "art_gallery", "museum"]
- "family day out" → ["park", "zoo", "restaurant", "museum", "amusement_park"]
- "cultural exploration" → ["museum", "art_gallery", "tourist_attraction", "library", "restaurant"]

Return ONLY a JSON array of place type strings. No explanation needed.
Example format: ["restaurant", "park", "museum"]
`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("🔄 Calling Gemini API for place type selection...");
    
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 100,
              temperature: 0.3, // Lower temperature for more consistent results
            },
          }),
        }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Gemini API error for place types: ${response.status} - ${errorText}`);
      throw new Error(`Gemini place type selection failed: ${response.status}`);
    }

  const result = await response.json();
  const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  let selectedTypes: string[];
  try {
    // Handle markdown-wrapped JSON responses
    let jsonText = rawText.trim();
    
    // Remove markdown code block markers if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    
    console.log("🔍 Extracted JSON text for parsing:", jsonText);
    
    const parsed = JSON.parse(jsonText);
    // Validate that it's an array of strings
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
      selectedTypes = parsed;
      console.log("✅ Successfully parsed Gemini place types:", selectedTypes);
    } else {
      console.warn("Gemini returned invalid format for place types:", rawText);
      selectedTypes = ["tourist_attraction", "park", "museum"]; // Fallback to generic types
    }
  } catch (e) {
    console.warn("Gemini returned non-JSON output for place types:", rawText);
    console.warn("JSON parsing error:", e);
    selectedTypes = ["tourist_attraction", "park", "museum"]; // Fallback to generic types
  }

  // Validate and filter selected types
  const validSelectedTypes = selectedTypes.filter(type => 
    AVAILABLE_PLACE_TYPES.includes(type)
  );
  
  if (validSelectedTypes.length === 0) {
    console.warn("No valid place types selected by Gemini, using defaults");
    return ["tourist_attraction", "park", "museum"];
  }

  // Ensure we only have up to 5 unique types
  const uniqueSelectedTypes = Array.from(new Set(validSelectedTypes));
  if (uniqueSelectedTypes.length > 5) {
    console.warn(`Gemini selected more than 5 types, truncating to 5: ${uniqueSelectedTypes.slice(0, 5).join(', ')}`);
    return uniqueSelectedTypes.slice(0, 5);
  }

  console.log(`✅ Gemini selected ${uniqueSelectedTypes.length} valid place types: ${uniqueSelectedTypes.join(', ')}`);
  return uniqueSelectedTypes;
  
  } catch (error) {
    console.error("❌ Error in place type selection:", error);
    // Return default types on any error
    return ["restaurant", "park", "tourist_attraction"];
  }
}
