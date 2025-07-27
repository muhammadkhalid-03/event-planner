import { readdir } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const logsDirectory = path.join(process.cwd(), "api_logs");
    const files = await readdir(logsDirectory);

    // Filter for JSON files and sort by date (newest first)
    const jsonFiles = files
      .filter((file) => file.endsWith(".json"))
      .sort((a, b) => {
        // Extract timestamp from filename if it exists
        const timestampA = a.match(/(\d+)\.json$/);
        const timestampB = b.match(/(\d+)\.json$/);

        if (timestampA && timestampB) {
          return parseInt(timestampB[1]) - parseInt(timestampA[1]);
        }

        // Fallback to alphabetical sorting
        return b.localeCompare(a);
      });

    return NextResponse.json({
      success: true,
      files: jsonFiles,
      count: jsonFiles.length,
    });
  } catch (error) {
    console.error("Error listing place files:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list place files", files: [] },
      { status: 500 },
    );
  }
}
