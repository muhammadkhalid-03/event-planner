import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

// Initialize Gemini client
function getGeminiClient() {
  return new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY || "dummy-key-for-build",
  );
}

export async function POST(request: NextRequest) {
  try {
    const { task, fileName = "restaurants.json" } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Gemini API key not configured. Please set GEMINI_API_KEY environment variable.",
        },
        { status: 400 },
      );
    }

    // Read restaurant data
    const filePath = path.join(process.cwd(), "api_logs", fileName);
    const fileContents = await fs.readFile(filePath, "utf8");
    const fileData = JSON.parse(fileContents);
    const restaurantData = fileData.restaurants || fileData;

    // Construct prompt and process with Gemini
    const prompt = constructPrompt(task, restaurantData);
    const response = await processWithGemini(prompt);

    return NextResponse.json({
      success: true,
      result: response,
      restaurantCount: restaurantData.length,
    });
  } catch (error: any) {
    console.error("Error processing restaurant data:", error);

    // Handle Gemini API errors
    if (error?.response?.status) {
      const status = error.response.status;
      if (status === 402 || status === 429) {
        return NextResponse.json(
          {
            success: false,
            error:
              "API quota exceeded. Please check your Google Cloud billing.",
          },
          { status },
        );
      }
      if (status === 401 || status === 403) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid Gemini API key or permission denied.",
          },
          { status },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process restaurant data. " + error.message,
      },
      { status: 500 },
    );
  }
}

// Helper function to construct prompts
function constructPrompt(task: string, restaurantData: any[]) {
  const dataPreview = JSON.stringify(restaurantData.slice(0, 3), null, 2);

  return `
You are a restaurant data analyst. I have a dataset of ${restaurantData.length} restaurants with the following structure:

Sample data (first 3 restaurants):
${dataPreview}

Task: ${task}

Please analyze the complete dataset and provide insights. The full dataset contains ${restaurantData.length} restaurants.

Restaurant data: ${JSON.stringify(restaurantData)}

Provide your analysis in a structured format with clear conclusions and actionable insights.
`;
}

async function processWithGemini(prompt: string) {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2000,
    },
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    systemInstruction: {
      role: "system",
      parts: [
        {
          text: "You are an expert restaurant data analyst. Provide detailed, actionable insights based on the data. Use markdown formatting for headers, lists, and key points.",
        },
      ],
    },
  });

  return result.response.text();
}
