// In your main application file (e.g., app.js or an OCR route)
import {
  extractTextFromFile,
  isVisionAvailable,
  initVisionClient,
} from "./../googleVisionService/googleVisionService.js";
import path from "path"; // Needed for example usage

initVisionClient();

export const processMyFile = async (filename) => {
  if (isVisionAvailable()) {
    console.log(`Attempting to extract text from: ${filename}`);
    const extractedText = await extractTextFromFile(filename);
    // console.log("Extracted Text:\n", extractedText);
    return extractedText;
  } else {
    console.error(
      "Google Vision API is not available. Check credentials and setup."
    );
  }
};
