import { writeFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const timestamp = Date.now();
    const placeData = {
      timestamp,
      searchLocation: data.coordinates,
      searchRadius: data.radius,
      placeType: data.placeType,
      searchMetadata: data.searchMetadata,
      places: data.places.map((place: any) => ({
        id: place.id,
        name: place.displayName,
        placeType: place.placeType,
        businessStatus: place.businessStatus,
        address: place.formattedAddress,
        location: place.location,
        rating: place.rating,
        userRatingCount: place.userRatingCount,
        priceLevel: place.priceLevel,
        types: place.types,
        phoneNumber: place.phoneNumber,
        websiteURI: place.websiteURI,
        regularOpeningHours: place.regularOpeningHours,
        reviews: place.reviews,
        photos: place.photos,
        editorialSummary: place.editorialSummary,
        // Restaurant-specific fields
        takeout: place.takeout,
        delivery: place.delivery,
        dineIn: place.dineIn,
        reservable: place.reservable,
        // Additional amenities
        allowsDogs: place.allowsDogs,
        goodForChildren: place.goodForChildren,
        goodForGroups: place.goodForGroups,
        restroom: place.restroom,
        detailsFetchedAt: place.detailsFetchedAt
      }))
    };

    // Use the provided fileName or create a default one
    const fileName = data.fileName ? `${data.fileName}-${timestamp}.json` : `places-${timestamp}.json`;
    const filePath = path.join(process.cwd(), 'api_logs', fileName);
    
    await writeFile(filePath, JSON.stringify(placeData, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      message: `Place data saved to ${fileName}`,
      fileName,
      placesCount: data.places.length,
      placeType: data.placeType
    });
  } catch (error) {
    console.error('Error saving place data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save place data' },
      { status: 500 }
    );
  }
} 