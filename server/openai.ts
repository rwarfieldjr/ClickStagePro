import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const MODEL = "gpt-5";

// This is using OpenAI's API, which points to OpenAI's API servers
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

/**
 * Generate a compelling property description from an image
 */
export async function generatePropertyDescription(base64Image: string): Promise<{
  headline: string;
  description: string;
  highlights: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a professional real estate copywriter. Analyze property images and create compelling, accurate listing descriptions that highlight key selling points and appeal to potential buyers. Focus on room features, natural light, space, and overall appeal. Respond in JSON format with: { 'headline': string (catchy 10-15 words), 'description': string (2-3 paragraphs), 'highlights': array of 4-6 key feature strings }",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this property image and create a compelling listing description that will attract buyers."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      headline: result.headline || "Beautiful Property Available",
      description: result.description || "A stunning property perfect for your next home.",
      highlights: result.highlights || []
    };
  } catch (error: any) {
    console.error('Error generating property description:', error.message);
    throw new Error("Failed to generate property description");
  }
}

/**
 * Recommend optimal staging styles based on room analysis
 */
export async function recommendStagingStyle(base64Image: string): Promise<{
  roomType: string;
  recommendedStyles: Array<{
    style: string;
    confidence: number;
    reasoning: string;
  }>;
  insights: string;
}> {
  try {
    const availableStyles = [
      "Modern Farmhouse",
      "Coastal",
      "Scandinavian",
      "Contemporary",
      "Mid-Century Modern",
      "Shabby Chic",
      "Mountain Rustic",
      "Transitional",
      "Japandi Minimalist",
      "Luxury Modern"
    ];

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert interior designer specializing in virtual staging. Analyze room images and recommend the best staging styles. Available styles: ${availableStyles.join(', ')}. Consider room architecture, natural light, size, and existing features. Respond in JSON format with: { 'roomType': string, 'recommendedStyles': [{style: string (must be from available styles), confidence: number (0-1), reasoning: string}] (top 3 styles), 'insights': string (overall analysis) }`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this room and recommend the top 3 staging styles that would work best."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      roomType: result.roomType || "Room",
      recommendedStyles: result.recommendedStyles || [],
      insights: result.insights || "This space has great potential for staging."
    };
  } catch (error: any) {
    console.error('Error recommending staging style:', error.message);
    throw new Error("Failed to recommend staging style");
  }
}

/**
 * Customer support chatbot
 */
export async function chatWithSupport(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  try {
    const systemPrompt = `You are a helpful customer support assistant for ClickStage Pro, a virtual staging service. 

Key information:
- We offer virtual staging services starting at $10 per photo
- Packages: 1 ($10), 5 ($45), 10 ($85), 20 ($160), 50 ($375), 100 ($700) photos
- Standard turnaround: 24-48 hours
- Rush delivery available for additional fee
- We support 10 staging styles: Modern Farmhouse, Coastal, Scandinavian, Contemporary, Mid-Century Modern, Shabby Chic, Mountain Rustic, Transitional, Japandi Minimalist, Luxury Modern
- File formats: JPG, PNG, WebP, GIF up to 10MB
- One minor revision included per photo

Be friendly, professional, and helpful. Answer questions about pricing, process, turnaround times, and features. If you don't know something specific, guide them to contact support directly.`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages,
      max_completion_tokens: 500,
    });

    return response.choices[0].message.content || "I apologize, but I'm having trouble responding right now. Please try again or contact our support team.";
  } catch (error: any) {
    console.error('Error in chat support:', error.message);
    throw new Error("Failed to process chat message");
  }
}

/**
 * Check if OpenAI is properly configured
 */
export function isConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
