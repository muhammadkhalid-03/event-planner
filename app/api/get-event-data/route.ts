import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const getAll = searchParams.get('all') === 'true';

    const logsDirectory = path.join(process.cwd(), 'api_logs');

    if (getAll) {
      // Return list of all event planning files with metadata
      const files = await readdir(logsDirectory);
      const eventFiles = files
        .filter(file => file.startsWith('event-plan-places-') && file.endsWith('.json'))
        .sort((a, b) => {
          const timestampA = parseInt(a.match(/(\d+)\.json$/)?.[1] || '0');
          const timestampB = parseInt(b.match(/(\d+)\.json$/)?.[1] || '0');
          return timestampB - timestampA; // Newest first
        });

      const fileMetadata = [];
      for (const file of eventFiles.slice(0, 10)) { // Limit to latest 10
        try {
          const filePath = path.join(logsDirectory, file);
          const content = await readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          fileMetadata.push({
            fileName: file,
            timestamp: data.timestamp,
            date: new Date(data.timestamp).toISOString(),
            searchLocation: data.searchLocation,
            totalPlaces: data.places?.length || 0,
            eventParameters: data.eventParameters,
            size: content.length
          });
        } catch (error) {
          console.warn(`Error reading file ${file}:`, error);
        }
      }

      return NextResponse.json({
        success: true,
        files: fileMetadata,
        totalFiles: eventFiles.length
      });
    }

    if (!fileName) {
      return NextResponse.json(
        { success: false, error: 'fileName parameter required' },
        { status: 400 }
      );
    }

    // Return specific file data
    const filePath = path.join(logsDirectory, fileName);
    const fileContent = await readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Extract useful information for further processing
    const processedData = {
      metadata: {
        fileName,
        timestamp: data.timestamp,
        date: new Date(data.timestamp).toISOString(),
        searchLocation: data.searchLocation,
        searchRadius: data.searchRadius,
        eventParameters: data.eventParameters
      },
      places: {
        total: data.places?.length || 0,
        byType: categorizeByType(data.places || []),
        topRated: getTopRated(data.places || []),
        locations: extractLocationsForMap(data.places || [])
      },
      rawData: data // Include full raw data
    };

    return NextResponse.json({
      success: true,
      data: processedData
    });

  } catch (error) {
    console.error('Error reading event data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read event data' },
      { status: 500 }
    );
  }
}

// Helper functions for data processing
function categorizeByType(places: any[]) {
  const categories = {
    restaurants: places.filter(p => p.placeType === 'restaurant'),
    parks: places.filter(p => p.placeType === 'park'),
    clubs: places.filter(p => p.placeType === 'club')
  };

  return {
    restaurants: {
      count: categories.restaurants.length,
      avgRating: getAverageRating(categories.restaurants),
      data: categories.restaurants
    },
    parks: {
      count: categories.parks.length,
      avgRating: getAverageRating(categories.parks),
      data: categories.parks
    },
    clubs: {
      count: categories.clubs.length,
      avgRating: getAverageRating(categories.clubs),
      data: categories.clubs
    }
  };
}

function getTopRated(places: any[], limit = 5) {
  return places
    .filter(p => p.rating)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, limit)
    .map(p => ({
      name: p.displayName,
      type: p.placeType,
      rating: p.rating,
      location: p.location,
      address: p.formattedAddress
    }));
}

function getAverageRating(places: any[]) {
  const ratedPlaces = places.filter(p => p.rating);
  if (ratedPlaces.length === 0) return null;
  
  const total = ratedPlaces.reduce((sum, p) => sum + (p.rating || 0), 0);
  return Math.round((total / ratedPlaces.length) * 100) / 100;
}

function extractLocationsForMap(places: any[]) {
  return places.map(place => ({
    id: place.id,
    name: place.displayName,
    type: place.placeType,
    location: place.location,
    rating: place.rating,
    address: place.formattedAddress
  }));
} 