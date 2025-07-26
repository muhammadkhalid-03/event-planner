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
- Make the plan practical, enjoyable, and tailored to the specific event type and group
- Use actual data from the provided places (names, addresses, ratings, etc.)
- NO hashtags, asterisks, dashes, or any markdown formatting
`;

    // Call Gemini API for event planning
const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key not configured' },
        { status: 400 }
      );
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "You are an expert event planner with deep knowledge of local venues, logistics, and creating memorable experiences."
            }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: eventPlanPrompt }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 4000,
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

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const eventPlan = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';

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





