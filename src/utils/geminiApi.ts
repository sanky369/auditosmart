import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the API
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

if (!API_KEY) {
  console.error('VITE_GOOGLE_API_KEY is not set in the environment variables');
}

const genAI = new GoogleGenerativeAI(API_KEY);

export async function analyzeEnergyData(analysisData: any, prompt: string) {
  if (!API_KEY) {
    throw new Error('Google API key is not set. Please check your environment variables.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-002" });

    // Combine the data and prompt
    const fullPrompt = `
      ${prompt}

      Energy Consumption Data (CSV):
      ${analysisData.energyData}
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error in Gemini API call:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to analyze energy data: ${error.message}`);
    } else {
      throw new Error('An unknown error occurred while analyzing energy data.');
    }
  }
}
