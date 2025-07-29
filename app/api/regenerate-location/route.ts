import { NextRequest, NextResponse } from "next/server";

// Mock replacement logic (can be upgraded to Google Places call)
export async function POST(req: NextRequest) {
  try {
    const { currentLocation, routeLocations, metadata } = await req.json();

    console.log("♻️ Regenerating location for:", currentLocation);

    const nearbyPlaces = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${currentLocation.location.lat},${currentLocation.location.lng}&radius=${metadata?.radius || 1000}&type=${currentLocation.type}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
    ).then((res) => res.json());

    const candidates = (nearbyPlaces.results || [])
      .filter(
        (place: any) =>
          place.place_id !== currentLocation.id &&
          !routeLocations.some((loc: any) => loc.id === place.place_id),
      )
      .map((place: any) => ({
        id: place.place_id,
        name: place.name,
        location: place.geometry.location,
        type: currentLocation.type,
        address: place.vicinity,
        rating: place.rating,
        price_level: place.price_level,
        tags: place.types,
      }));

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "No replacement found" },
        { status: 404 },
      );
    }

    const newLoc = candidates[0]; // Pick first candidate
    console.log("✅ Replacement found:", newLoc.name);

    return NextResponse.json(newLoc);
  } catch (error) {
    console.error("❌ Error regenerating location:", error);
    return NextResponse.json(
      { error: "Failed to regenerate" },
      { status: 500 },
    );
  }
}
