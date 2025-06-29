import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import OpenAI from 'openai';

// Initialize DeepSeek client
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
});


export async function POST(request: NextRequest) {
  try {
    const { task, fileName = 'restaurants.json' } = await request.json();

    // Check if DeepSeek API key is configured
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'DeepSeek API key not configured. Please set DEEPSEEK_API_KEY environment variable.' },
        { status: 400 }
      );
    }

    // Read the restaurant data from JSON file
    const filePath = path.join(process.cwd(), 'api_logs', fileName);
    const fileContents = await fs.readFile(filePath, 'utf8');
    const fileData = JSON.parse(fileContents);
    
    // Extract restaurants array from the saved data structure
    const restaurantData = fileData.restaurants || fileData;

    // Construct the prompt based on the task
    const prompt = constructPrompt(task, restaurantData);

    // Process with DeepSeek
    const response = await processWithDeepSeek(prompt);

    return NextResponse.json({ 
      success: true, 
      result: response,
      restaurantCount: restaurantData.length 
    });

  } catch (error) {
    console.error('Error processing restaurant data:', error);
    
    // Handle specific DeepSeek API errors
    if (error instanceof Error) {
      if (error.message.includes('402') || error.message.includes('Insufficient Balance')) {
        return NextResponse.json(
          { success: false, error: 'Insufficient DeepSeek API balance. Please add credits to your DeepSeek account.' },
          { status: 402 }
        );
      }
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { success: false, error: 'Invalid DeepSeek API key. Please check your DEEPSEEK_API_KEY environment variable.' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to process restaurant data. Please try again.' },
      { status: 500 }
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

// DeepSeek processing function
async function processWithDeepSeek(prompt: string) {
  const completion = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: 'You are an expert restaurant data analyst. Provide detailed, actionable insights based on the restaurant data provided.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  return completion.choices[0].message.content;
}
