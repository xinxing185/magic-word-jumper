
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getEncouragement = async (score: number, total: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `My 5-year-old daughter just finished a word learning game. She got ${score} out of ${total} correct. 
      Write a short (max 20 words), extremely encouraging, and fun message for her in English. 
      Include some emojis!`,
    });
    return response.text || "Wow! You are a superstar! Keep playing! 🌟";
  } catch (error) {
    console.error("Gemini error:", error);
    return "Amazing job, little explorer! You're getting so smart! 🚀";
  }
};
