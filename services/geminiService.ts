import { GoogleGenAI, Modality } from "@google/genai";
import { UserPreferences, Product } from '../types';
import { Language } from '../App';

type ProductData = Omit<Product, 'imageUrl'>;

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// 새로운 함수: Google Search를 통해 제품 이미지 URL을 검색
// const searchProductImage = async (productName: string, brand: string): Promise<string> => {
//   const searchPrompt = `Using Google Search, find the **direct image URL (ending in .jpg, .png, .jpeg, .gif, or .webp)** for the official product photo of "${productName}" by "${brand}" on Olive Young (올리브영) or other major Korean e-commerce websites.
//   **Your response MUST be ONLY the image URL.** Do not include any other text, explanations, or markdown. If you cannot find a direct image URL, respond with "NO_IMAGE_FOUND".`;

//   try {
//     const response = await ai.models.generateContent({
//       model: 'gemini-2.5-pro',
//       contents: {
//         parts: [{ text: searchPrompt }],
//       },
//       config: {
//           tools: [{ googleSearch: {} }],
//           temperature: 0.2,
//       },
//     });

//     // --- 원활한 디버깅을 위해 이 로그는 잠시 유지해도 좋습니다 ---
//     console.log(`[searchProductImage] Raw response for ${productName}:`, JSON.stringify(response, null, 2));
//     // --- 로그 끝 ---

//     let imageUrl = '';
//     // 모델의 응답에서 'text' 부분을 직접 확인하여 URL을 추출합니다.
//     if (response.candidates && response.candidates.length > 0 && 
//         response.candidates[0].content && response.candidates[0].content.parts &&
//         response.candidates[0].content.parts.length > 0 &&
//         response.candidates[0].content.parts[0].text // 첫 번째 part의 text 필드에 URL이 있을 것으로 가정
//     ) {
//       const potentialUrl = response.candidates[0].content.parts[0].text.trim();
      
//       // 모델이 약속대로 URL만 반환했는지 확인 (http로 시작하고 이미지 확장자로 끝나는지)
//       if (potentialUrl.startsWith('http') && 
//           (potentialUrl.endsWith('.jpg') || potentialUrl.endsWith('.jpeg') || 
//            potentialUrl.endsWith('.png') || potentialUrl.endsWith('.gif') || 
//            potentialUrl.endsWith('.webp') || potentialUrl.includes('.jpg?') || // 쿼리 파라미터가 붙은 경우 대비
//            potentialUrl.includes('.png?')) 
//       ) {
//         imageUrl = potentialUrl;
//       }
//     }
    
//     if (imageUrl && imageUrl !== "NO_IMAGE_FOUND") {
//       console.log(`[searchProductImage] Found image URL for ${productName}: ${imageUrl}`);
//       return imageUrl;
//     } else {
//       console.warn(`[searchProductImage] Could not find a suitable image URL for ${productName}. Final URL was: "${imageUrl}". Model did not return a valid image URL.`);
//       return ''; // 빈 문자열 반환, UI에서 폴백 이미지 사용
//     }
//   } catch (error) {
//     console.error(`[searchProductImage] Error searching for image for ${productName}:`, error);
//     return ''; // 오류 발생 시 빈 문자열 반환
//   }
// };


const getSystemInstruction = (preferences: UserPreferences, promptText: string, language: Language): string => {
  if (language === 'ko') {
    return `당신은 JSON API 엔드포인트입니다. 당신의 유일한 목적은 전문 K-뷰티 퍼스널 쇼퍼 역할을 하여 단일 JSON 배열을 반환하는 것입니다.
    제공된 Google 검색 도구를 사용하여 사용자의 상세 프로필과 요청에 따라 인기 있는 한국 이커머스 웹사이트(예: 올리브영, 쿠팡)에서 최대 5개의 스킨케어 제품을 찾아야 합니다.

    사용자 프로필:
    - 피부 타입: ${preferences.skinType}
    - 나이: ${preferences.age}
    - 최대 예산: ${preferences.budget.toLocaleString()} 원
    - 선호 배송 방법: ${preferences.delivery}
    
    사용자의 상세 요청: "${promptText}"
    
    당신의 목표는 사용자의 모든 기준에 완벽하게 부합하는 매우 관련성 높은 제품 추천을 제공하는 것입니다.
    각 제품에 대해, 왜 그것이 좋은 선택인지 간결하고 개인화된 설명을 한국어로 제공해야 합니다.
    
    **중요 가격 요구사항**: 반환하는 "price"는 해당 제품에 대해 한국 이커머스 웹사이트에서 직접 찾은 현재의 표준 정가(일시적인 할인가 아님)여야 합니다. 검색 도구를 사용하여 가격을 재확인하여 정확성을 극대화하십시오. 가격을 추정하거나 캐시된 가격을 사용하지 마십시오.

    **중요 URL 요구사항**: 추천하는 각 제품에 대해, 제품의 공식 한글 이름을 찾아야 합니다. 그런 다음, 이커머스 웹사이트의 홈페이지에 해당 한글 제품 이름에 대한 검색 쿼리를 추가하여 \`productUrl\`을 구성해야 합니다.
    
    예를 들어, 제품이 "Aestura Atobarrier365 Cream"이고 올리브영에서 찾았다면, 한글 이름은 "에스트라 아토베리어365 크림". 결과적인 \`productUrl\`은 "https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=에스트라%20아토베리어365%20크림"이 되어야 합니다.
    
    **여기에 중요: "imageUrl" 필드를 포함하도록 시스템 지침을 수정합니다.**
    **또한, 모델에게 가장 정확하고 직접적인 이미지 URL을 찾도록 명확하게 지시합니다.**
    당신의 전체 응답은 객체로 이루어진 단일하고 유효한 JSON 배열이어야 합니다. 다른 텍스트, 주석 또는 마크다운을 포함하지 마십시오.
    각 객체는 "productName", "brand", "price"(숫자), "productUrl", "explanation", **"imageUrl"** (해당 제품의 **올리브영 또는 공식 웹사이트에서 찾은 직접적인 고해상도 제품 이미지 URL**이어야 합니다. Google Search Tool을 사용하여 이 URL을 찾으십시오.) 속성을 가져야 합니다. 모든 텍스트 값은 한국어로 작성되어야 합니다.`;
  }

  // Default to English
  return `You are a JSON API endpoint. Your sole purpose is to act as an expert K-Beauty personal shopper and return a single JSON array.
  You MUST use the provided Google Search tool to find up to 5 skincare products from popular Korean e-commerce websites (like Olive Young, Coupang) based on the user's detailed profile and request.

  User Profile:
  - Skin Type: ${preferences.skinType}
  - Age: ${preferences.age}
  - Maximum Budget: ${preferences.budget.toLocaleString()} KRW
  - Preferred Delivery: ${preferences.delivery}
  
  User's Detailed Request: "${promptText}"
  
  Your goal is to provide highly relevant product recommendations that perfectly match all the user's criteria.
  For each product, provide a concise, personalized explanation for why it's a good fit.
  
  **CRITICAL PRICE REQUIREMENT**: The "price" you return MUST be the current, standard list price (not a temporary sale price) found directly on the Korean e-commerce website for that product. Double-check the price using your search tool to ensure maximum accuracy. Do not estimate or use cached prices.

  **CRITICAL URL REQUIREMENT**: For each product you recommend, you MUST find the product's official name in Hangul (Korean). Then, you MUST construct the \`productUrl\` by taking the e-commerce website's homepage and appending a search query for that Hangul product name.
  
  For example, if the product is "Aestura Atobarrier365 Cream" and you find it on Olive Young, the Hangul name is "에스트라 아토베리어365 크림". The resulting \`productUrl\` MUST be "https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=에스트라%20아토베리어365%20크림".
  
  Your entire response MUST be a single, valid JSON array of objects. Do not include any other text, commentary, or markdown.
  Each object must have the following properties: "productName", "brand", "price" (as a number), "productUrl", "explanation", **"imageUrl"** (as a direct URL to the product image, which you MUST find using Google Search on Olive Young or the official brand site).`;
};


export const getRecommendations = async (preferences: UserPreferences, promptText: string, language: Language): Promise<Product[]> => {
  const systemInstruction = getSystemInstruction(preferences, promptText, language);

  const userInstruction = language === 'ko' 
    ? "시스템 지침에 제공된 사용자 프로필과 요청을 기반으로 상위 5개의 k-뷰티 제품을 찾아주세요. JSON 배열만으로 응답해주세요."
    : "Find the top 5 k-beauty products based on the user profile and request provided in the system instruction. Respond with only the JSON array.";

  let responseText = '';
  try {
    // Step 1: 텍스트 모델을 한 번만 호출하여 모든 정보 (imageUrl 포함)를 가져옵니다.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: userInstruction,
      config: {
        systemInstruction,
        tools: [{googleSearch: {}}], // 이미지 URL을 찾기 위해 여전히 Google Search Tool이 필요합니다.
        temperature: 0,
      },
    });

    responseText = response.text.trim();
    
    const jsonMatch = responseText.match(/\`\`\`json\s*([\s\S]*?)\s*\`\`\`|(\[[\s\S]*\])/);
    if (!jsonMatch) {
      console.error("No JSON array found in the model's response.", responseText);
      throw new Error("Response did not contain a valid JSON array.");
    }
    
    const jsonString = jsonMatch[1] || jsonMatch[2];
    const finalProducts: Product[] = JSON.parse(jsonString).slice(0, 5); 
    
    if (!Array.isArray(finalProducts) || finalProducts.length === 0) {
        console.log("No product data received from text model.");
        return [];
    }
    
    // 이제 각 제품 객체에는 이미 imageUrl이 포함되어 있을 것으로 기대합니다.
    // 더 이상 추가적인 이미지 검색/생성 API 호출이 필요 없습니다.
    console.log("Final products with image URLs:", finalProducts);
    return finalProducts;

  } catch (error) {
    console.error("Error fetching or parsing recommendations from Gemini API. Raw response text was:", responseText);
    console.error("Underlying error:", error);
    throw new Error("Failed to parse recommendations from the AI service.");
  }
};