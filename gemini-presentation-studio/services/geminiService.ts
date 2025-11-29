import { GoogleGenAI, Modality, Type } from "@google/genai";

const getAiClient = () => {
  // The API key is injected from the environment and should not be hardcoded.
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set. Please configure it in your environment.");
  }
  // Debug: Log first/last 4 chars of API key
  const key = process.env.API_KEY;
  console.log(`[DEBUG] Using API key: ${key.substring(0, 8)}...${key.substring(key.length - 4)}`);
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

const processImageResponse = (response: any): string => {
   if (response.candidates && response.candidates.length > 0) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          const responseMimeType = part.inlineData.mimeType || 'image/png';
          return `data:${responseMimeType};base64,${base64ImageBytes}`;
        }
      }
  }
  throw new Error("Image generation failed or the response did not contain an image.");
}

export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  aspectRatio: string = "1:1",
  imageSize: string = "1K"
): Promise<string> => {
  const ai = getAiClient();

  const imagePart = {
    inlineData: {
      data: base64ImageData,
      mimeType: mimeType,
    },
  };

  const textPart = {
    text: prompt,
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [imagePart, textPart],
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: imageSize
      },
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  return processImageResponse(response);
};

export const generateImageFromPrompt = async (
  prompt: string,
  aspectRatio: string = "1:1",
  imageSize: string = "1K"
): Promise<string> => {
  const ai = getAiClient();

  const textPart = {
    text: prompt,
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [textPart],
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: imageSize
      },
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  return processImageResponse(response);
}

export const getSuggestionsForImage = async (
  base64ImageData: string,
  prompt: string
): Promise<string[]> => {
  const ai = getAiClient();
  
  const imagePart = {
    inlineData: {
      data: base64ImageData,
      mimeType: 'image/png', // Assume png for suggestions, as it's a data URL
    },
  };

  const textPart = {
    text: `Based on the original prompt "${prompt}", suggest 3 creative, single-sentence improvements for this image. The suggestions should be distinct and phrased as instructions to add to a prompt, for example: "add a cinematic lighting effect", "change the style to vaporwave", or "make the cat wear a tiny hat".`,
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [imagePart, textPart],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            }
          }
        }
      }
    }
  });

  try {
    const jsonString = response.text;
    const result = JSON.parse(jsonString);
    if (result.suggestions && Array.isArray(result.suggestions)) {
      return result.suggestions.slice(0, 3); // Return max 3 suggestions
    }
  } catch(e) {
    console.error("Error parsing suggestions JSON:", e);
  }

  return [];
};


// Generate image using multiple source photos as reference
export const generateWithMultipleImages = async (
  sourceImages: Array<{ base64Data: string; mimeType: string }>,
  prompt: string,
  aspectRatio: string = "1:1",
  imageSize: string = "1K"
): Promise<string> => {
  const ai = getAiClient();

  // Build parts array with all source images first, then the text prompt
  const parts: any[] = [];

  // Add each source image as a part
  for (const img of sourceImages) {
    parts.push({
      inlineData: {
        data: img.base64Data,
        mimeType: img.mimeType,
      },
    });
  }

  // Add the text prompt as the final part
  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: parts,
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: imageSize
      },
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  return processImageResponse(response);
};

// Helper to fetch image from URL and convert to base64
export const fetchImageAsBase64 = async (imageUrl: string): Promise<{ base64Data: string; mimeType: string }> => {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const blob = await response.blob();
  const mimeType = blob.type || 'image/png';

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Extract base64 data without the data URL prefix
      const base64Data = dataUrl.split(',')[1];
      resolve({ base64Data, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const generateVideoFromPrompt = async (
  prompt: string,
  onProgress: (message: string) => void,
  startImage: { mimeType: string, data: string } | null,
  aspectRatio: '16:9' | '9:16',
  resolution: '720p' | '1080p'
): Promise<string> => {
  // Create a new client instance for each call to ensure the latest API key is used.
  const ai = getAiClient();

  onProgress("Starting video generation...");

  const requestPayload: any = {
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: resolution,
      aspectRatio: aspectRatio
    }
  };

  if (startImage) {
    requestPayload.image = {
      imageBytes: startImage.data,
      mimeType: startImage.mimeType
    };
  }
  
  let operation = await ai.models.generateVideos(requestPayload);
  
  onProgress("Video is processing... this may take a few minutes.");

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
    operation = await ai.operations.getVideosOperation({ operation: operation });
    onProgress("Still working... hang tight!");
  }

  onProgress("Finalizing video...");

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    throw new Error("Video generation completed, but no download link was found.");
  }

  onProgress("Downloading your video...");

  // The download link requires the API key.
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }

  const videoBlob = await response.blob();

  // Convert blob to base64 data URL for persistent storage
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(videoBlob);
  });
}