import { GoogleGenAI, Type } from "@google/genai";
import { Word } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Parses content into structured Word objects using Gemini.
 * Supports both raw text and base64 encoded files (Images, PDF).
 */
export const parseVocabularyFile = async (
  fileName: string, 
  content: string, 
  mimeType: string,
  isBase64: boolean
): Promise<Word[]> => {
  try {
    const model = "gemini-2.5-flash";
    
    // Construct the prompt parts
    const promptText = `
      You are a helpful vocabulary assistant. 
      Analyze the provided file content (filename: "${fileName}").
      Extract all English vocabulary words found in the file.
      For each word, provide:
      1. The English word ("text")
      2. Its IPA phonetic symbol ("phonetic"). Use standard British pronunciation if possible.
      3. A concise Chinese definition ("definition"). If missing, translate the word to Chinese.
      
      Output strictly a JSON array.
    `;

    const parts: any[] = [];
    
    if (isBase64) {
        // Multimodal Input (PDF, Images)
        // Word docs are converted to text before this function is called, so they go to 'else'
        parts.push({
            inlineData: {
                mimeType: mimeType,
                data: content
            }
        });
        parts.push({ text: promptText });
    } else {
        // Text Input (TXT, MD, CSV, Extracted Word content)
        // Truncate text if extremely large (safety buffer)
        const safeContent = content.length > 200000 ? content.substring(0, 200000) : content;
        parts.push({ text: promptText + "\n\nFile Content:\n" + safeContent });
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The English word" },
              phonetic: { type: Type.STRING, description: "IPA phonetic symbol" },
              definition: { type: Type.STRING, description: "Chinese definition" },
            },
            required: ["text", "phonetic", "definition"],
          },
        },
      },
    });

    let jsonString = response.text || "[]";
    // Sanitize: sometimes models wrap in ```json ... ``` despite mimeType set
    jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

    const rawData = JSON.parse(jsonString);
    
    // Add unique IDs and sanitize
    return rawData.map((item: any) => ({
      id: crypto.randomUUID(),
      text: item.text?.trim(),
      phonetic: item.phonetic?.trim() || "",
      definition: item.definition?.trim()
    })).filter((w: Word) => w.text && w.text.length > 0);

  } catch (error) {
    console.error("Gemini Parsing Error Details:", error);
    throw new Error("AI解析失败，请检查文件格式或网络连接。");
  }
};