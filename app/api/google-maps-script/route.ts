import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get the API key from server-side environment variable (not NEXT_PUBLIC_)
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Maps API key not configured" },
        { status: 500 }
      );
    }

    // Get the libraries parameter from the request URL
    const { searchParams } = new URL(request.url);
    const libraries = searchParams.get("libraries") || "places,marker,geometry";

    // Return the script URL with the API key (this keeps the key on the server)
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries}`;

    return NextResponse.json(
      { scriptUrl },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=3600", // Cache for 1 hour
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error) {
    console.error("Error generating Google Maps script URL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
