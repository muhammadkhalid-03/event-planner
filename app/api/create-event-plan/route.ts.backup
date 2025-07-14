import { readFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { task, fileName, eventDetails } = await request.json();
    
    if (!task || !fileName) {
      return NextResponse.json(
        { success: false, error: 'Task and file name are required' },
        { status: 400 }
      );
    }

    // Read the place data file
    const filePath = path.join(process.cwd(), 'api_logs', fileName);
    const fileContent = await readFile(filePath, 'utf-8');
    const placeData = JSON.parse(fileContent);
    
    // Extract places from the data structure
    let places = [];
    if (placeData.places) {
      places = placeData.places;
    } else if (placeData.restaurants) {
      places = placeData.restaurants;
    } else if (Array.isArray(placeData)) {
      places = placeData;
    }

    // Create a comprehensive prompt for event planning
    const eventPlanPrompt = `
You are an expert event planner. Create a detailed, personalized event plan using the provided place data.

EVENT REQUIREMENTS:
- Event Type: ${eventDetails?.eventType || 'general'}
- Duration: ${eventDetails?.timeDuration || 'flexible'}
- Number of Locations: ${eventDetails?.numberOfLocations || 3}
- Group Size: ${eventDetails?.groupSize || 'flexible'}
- Budget: ${eventDetails?.budget || 'moderate'}

CUSTOM REQUEST: ${task}

AVAILABLE PLACES DATA:
${JSON.stringify(places, null, 2)}

Please create a comprehensive event plan that includes:

1. **Event Overview**: Brief description of the planned event
2. **Detailed Itinerary**: Hour-by-hour schedule with specific venues
3. **Venue Details**: For each location, include:
   - Name and address
   - Why it was chosen
   - Rating and key features
   - Estimated time to spend there
   - Budget considerations
4. **Logistics**: 
   - Travel routes and times between locations
   - Transportation recommendations
   - Parking information if available
5. **Backup Options**: Alternative venues in case primary choices are unavailable
6. **Budget Breakdown**: Estimated costs for the event
7. **Special Considerations**: Any timing, accessibility, or other important notes

Make the plan practical, enjoyable, and tailored to the specific event type and group. Use actual data from the provided places (names, addresses, ratings, etc.) and create a realistic timeline that accounts for travel time between locations.

Format the response in a clear, easy-to-read structure with proper headings and bullet points.
`;

    // Call DeepSeek API for event planning
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert event planner with deep knowledge of local venues, logistics, and creating memorable experiences.'
          },
          {
            role: 'user',
            content: eventPlanPrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7
      })
    });

    if (!deepseekResponse.ok) {
      throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
    }

    const deepseekResult = await deepseekResponse.json();
    const eventPlan = deepseekResult.choices[0].message.content;

    return NextResponse.json({
      success: true,
      result: eventPlan,
      placeCount: places.length,
      eventDetails: eventDetails
    });

  } catch (error) {
    console.error('Error creating event plan:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create event plan. Please check your data file and try again.',
      placeCount: 0
    });
  }
} 