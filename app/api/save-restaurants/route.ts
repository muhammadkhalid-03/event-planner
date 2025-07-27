import { writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const timestamp = Date.now();
    const restaurantData = {
      timestamp,
      searchLocation: data.coordinates,
      searchRadius: data.radius,
      restaurants: data.restaurants.map((restaurant: any) => ({
        name: restaurant.displayName,
        businessStatus: restaurant.businessStatus,
        address: restaurant.formattedAddress,
        rating: restaurant.rating,
        priceLevel: restaurant.priceLevel,
        types: restaurant.types,
      })),
    };

    const fileName = `restaurants-${timestamp}.json`;
    const filePath = path.join(process.cwd(), "api_logs", fileName);

    await writeFile(filePath, JSON.stringify(restaurantData, null, 2));

    return NextResponse.json({
      success: true,
      message: `Restaurant data saved to ${fileName}`,
      fileName,
    });
  } catch (error) {
    console.error("Error saving restaurant data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save restaurant data" },
      { status: 500 },
    );
  }
}
