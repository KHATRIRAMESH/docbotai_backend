
import { extractStructuredData } from "./openAI.js";

export const processGoogleVisionOutput = async (googleVisionOcrText) => {
  try {
    console.log("Sending text from Google Vision to OpenAI for structuring...");
    const structuredResult = await extractStructuredData(googleVisionOcrText);

    if (structuredResult.error) {
      console.error("Error during structuring:", structuredResult.error);
    } else {
      // console.log("Structured Data:", structuredResult);
      return structuredResult;
    }
  } catch (e) {
    console.error("An unexpected error occurred:", e);
  }
};

