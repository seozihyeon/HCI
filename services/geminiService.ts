import { GoogleGenAI } from "@google/genai";
import { UserPreferences, Product } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const getRecommendations = async (preferences: UserPreferences, promptText: string): Promise<Product[]> => {
  const systemInstruction = `You are a JSON API endpoint. Your sole purpose is to act as an expert K-Beauty personal shopper and return a single JSON array.
  You MUST use the provided Google Search tool to find up to 5 skincare products from popular Korean e-commerce websites (like Olive Young, Coupang) based on the user's detailed profile and request.

  User Profile:
  - Skin Type: ${preferences.skinType}
  - Age: ${preferences.age}
  - Maximum Budget: ${preferences.budget.toLocaleString()} KRW
  - Preferred Delivery: ${preferences.delivery}
  
  User's Detailed Request: "${promptText}"
  
  Your goal is to provide highly relevant product recommendations that perfectly match all the user's criteria. For each product, provide a concise, personalized explanation for why it's a good fit.
  
  **CRITICAL URL REQUIREMENT**: For each product you recommend, you MUST find the product's official name in Hangul (Korean). Then, you MUST construct the \`productUrl\` by taking the e-commerce website's homepage and appending a search query for that Hangul product name.
  
  For example, if the product is "Aestura Atobarrier365 Cream" and you find it on Olive Young, the Hangul name is "에스트라 아토베리어365 크림". The resulting \`productUrl\` MUST be "https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=에스트라%20아토베리어365%20크림".
  For Coupang, a similar search URL would be "https://www.coupang.com/np/search?q=에스트라%20아토베리어365%20크림".
  
  Do not provide a deep link to the product page or just the homepage. The URL must link directly to the search results on that site.
  
  **CRITICAL IMAGE REQUIREMENT**: The \`imageUrl\` MUST be a direct, working URL to a high-quality, official image of the exact product being recommended. The image should be sourced from the same e-commerce domain as the \`productUrl\` if possible. It must clearly show the product packaging. Do not use generic brand logos, placeholder images, or images of different products. Do not invent or guess URLs.
  
  Your entire response MUST be a single, valid JSON array of objects. Do not include any other text, commentary, or markdown formatting like \`\`\`json.
  Each object must have the following properties: "productName", "brand", "price" (as a number), "imageUrl", "productUrl", "explanation".`;

  let responseText = '';
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro", // Using a more powerful model for better tool use and JSON adherence
      contents: "Find the top 5 k-beauty products based on the user profile and request provided in the system instruction. Respond with only the JSON array.",
      config: {
        systemInstruction,
        tools: [{googleSearch: {}}],
        temperature: 0, // Lower temperature for more deterministic and factual responses
      },
    });

    responseText = response.text.trim();
    
    // More robustly extract the JSON part of the response.
    // The model might still wrap it in markdown or add explanatory text.
    const jsonMatch = responseText.match(/\`\`\`json\s*([\s\S]*?)\s*\`\`\`|(\[[\s\S]*\])/);
    if (!jsonMatch) {
      console.error("No JSON array found in the model's response.", responseText);
      throw new Error("Response did not contain a valid JSON array.");
    }
    
    // Use the first captured group that is not undefined (either from markdown or a raw array)
    const jsonString = jsonMatch[1] || jsonMatch[2];
    const result = JSON.parse(jsonString);
    
    if (Array.isArray(result)) {
      return result.slice(0, 5);
    }
    
    return [];

  } catch (error) {
    console.error("Error fetching or parsing recommendations from Gemini API. Raw response text was:", responseText);
    console.error("Underlying error:", error);
    throw new Error("Failed to parse recommendations from the AI service.");
  }
};