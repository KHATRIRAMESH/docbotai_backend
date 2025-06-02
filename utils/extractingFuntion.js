// Assume 'googleVisionOcrText' is a string containing the text
// extracted by Google Cloud Vision API.

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
      // Now you have a JavaScript object (structuredResult)
      // with fields like first_name, address, document_type, etc.,
      // and raw_extracted_text.
    }
  } catch (e) {
    console.error("An unexpected error occurred:", e);
  }
};

// Example usage:
// const myOcrText = "John Doe\n123 Main St\nInvoice Date: 2024-05-30...";
// processGoogleVisionOutput(myOcrText);
