import { NextRequest, NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const apiLogsDir = path.join(process.cwd(), 'api_logs');
    const files = await readdir(apiLogsDir);
    
    // Filter to only restaurant JSON files and sort by newest first
    const restaurantFiles = files
      .filter(file => file.startsWith('restaurants-') && file.endsWith('.json'))
      .sort((a, b) => {
        // Extract timestamp from filename
        const timestampA = parseInt(a.replace('restaurants-', '').replace('.json', ''));
        const timestampB = parseInt(b.replace('restaurants-', '').replace('.json', ''));
        return timestampB - timestampA; // Newest first
      });

    return NextResponse.json({ 
      success: true, 
      files: restaurantFiles 
    });

  } catch (error) {
    console.error('Error listing restaurant files:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list restaurant files' },
      { status: 500 }
    );
  }
} 