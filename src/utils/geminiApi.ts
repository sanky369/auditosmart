import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the API
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

if (!API_KEY) {
  console.error('VITE_GOOGLE_API_KEY is not set in the environment variables');
}

const genAI = new GoogleGenerativeAI(API_KEY);

export async function analyzeEnergyData(buildingData: any, csvData: string) {
  if (!API_KEY) {
    throw new Error('Google API key is not set. Please check your environment variables.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
      Analyze the following energy consumption data for a building and provide recommendations:

      Building Information:
      ${JSON.stringify(buildingData, null, 2)}

      Energy Consumption Data (CSV):
      ${csvData}

      Please provide:
      1. A summary of the energy consumption patterns
      2. Identification of any inefficiencies or anomalies
      3. Recommendations for improving energy efficiency
      4. Potential cost savings estimates
    `;

    const result = await model.generateContent(prompt);
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