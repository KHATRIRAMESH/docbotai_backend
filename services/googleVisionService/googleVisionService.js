import { ImageAnnotatorClient } from "@google-cloud/vision";
import fs from "fs";
import path from "path";

// Initialize with environment variable containing service account credentials
let visionClient = null;

/**
 * Initialize Google Vision client with credentials
 */
export async function initVisionClient() {
  try {
    // Get the credentials JSON string from environment
    const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS;

    if (!credentialsJson) {
      console.warn("Google Cloud Vision credentials not found in environment");
      return null;
    }

    // Try to initialize client with different credential formats
    try {
      // First try: Parse as JSON object (full service account credentials)
      if (credentialsJson.trim().startsWith("{")) {
        const credentials = JSON.parse(credentialsJson);
        visionClient = new ImageAnnotatorClient({
          credentials: credentials,
        });
      }
      // Second try: Handle as simple API key
      else if (credentialsJson.startsWith("AIza")) {
        visionClient = new ImageAnnotatorClient({
          apiKey: credentialsJson,
        });
      }
      // Third try: Try to base64 decode (some systems encode JSON as base64)
      else if (/^[A-Za-z0-9+/=]+$/.test(credentialsJson.trim())) {
        try {
          // Attempt to decode as base64
          const decodedJson = Buffer.from(credentialsJson, "base64").toString(
            "utf-8"
          );

          // Check if decode resulted in valid JSON
          if (decodedJson.trim().startsWith("{")) {
            const credentials = JSON.parse(decodedJson);
            visionClient = new ImageAnnotatorClient({
              credentials: credentials,
            });
            console.log(
              "Google Vision client initialized with base64-decoded credentials"
            );
          } else {
            // If not valid JSON, try without explicit credentials
            visionClient = new ImageAnnotatorClient();
            console.log(
              "Base64 decode did not result in valid JSON, using default credentials"
            );
          }
        } catch (base64Error) {
          console.warn("Base64 decode failed, using default credentials");
          visionClient = new ImageAnnotatorClient();
        }
      }
      // Fourth try: Use environment variable as is (auto-detected)
      else {
        visionClient = new ImageAnnotatorClient();
      }

      // Test if client works by making a simple call
      await visionClient.auth
        .getAccessToken()
        .then(() => {
          console.log(
            "Google Vision client initialized and authenticated successfully"
          );
        })
        .catch((authError) => {
          console.warn(
            "Google Vision client initialized but authentication failed:",
            authError.message
          );
        });

      return visionClient;
    } catch (parseError) {
      console.error(
        "Failed to parse or use Google Cloud credentials:",
        parseError
      );

      // Last attempt: try to initialize without explicit credentials
      // (relies on GOOGLE_APPLICATION_CREDENTIALS environment variable)
      try {
        visionClient = new ImageAnnotatorClient();
        console.log(
          "Google Vision client initialized without explicit credentials"
        );

        // Test authentication
        visionClient.auth
          .getAccessToken()
          .then(() => {
            console.log(
              "Google Vision client authentication successful with default credentials"
            );
          })
          .catch((authError) => {
            console.warn(
              "Google Vision authentication failed with default credentials:",
              authError.message
            );
          });

        return visionClient;
      } catch (fallbackError) {
        console.error("Fallback initialization also failed:", fallbackError);
        return null;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error initializing Google Vision client:", errorMessage);
    return null;
  }
}

/**
 * Get or initialize the vision client
 */
export function getVisionClient() {
  if (!visionClient) {
    return initVisionClient();
  }
  return visionClient;
}

/**
 * Extract text from an image using Google Vision OCR
 * @param {string} imagePath Path to the image file
 * @returns {Promise<string>} Extracted text
 */
export async function extractTextFromImage(imagePath) {
  const client = getVisionClient();

  if (!client) {
    console.warn(
      "Google Vision client not initialized, cannot extract text from image"
    );
    return "Google Vision OCR service not available. Please check your Google Cloud credentials.";
  }

  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      console.error(`Image file not found: ${imagePath}`);
      return `Error: Image file not found: ${path.basename(imagePath)}`;
    }

    // Read image content
    const fullPath = path.resolve(imagePath);
    const imageStats = fs.statSync(fullPath);

    // Check file size to avoid processing very large images
    const maxFileSizeBytes = 20 * 1024 * 1024; // 20 MB max
    if (imageStats.size > maxFileSizeBytes) {
      console.warn(
        `Image file too large (${Math.round(
          imageStats.size / (1024 * 1024)
        )} MB), may fail OCR`
      );
    }

    const imageContent = fs.readFileSync(fullPath);

    // Perform OCR with Google Vision with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("OCR request timed out")), 30000); // 30 second timeout
    });

    const ocrPromise = client.textDetection(imageContent).then(([result]) => {
      const detections = result.textAnnotations || [];

      if (detections.length === 0) {
        console.log("No text detected in image");
        return "No text detected in image. The image may not contain text or the text may be unclear.";
      }

      // The first annotation contains the entire text
      const fullText = detections[0].description || "";
      console.log(
        `Successfully extracted ${fullText.length} characters from image`
      );

      return fullText;
    });

    // Race between OCR and timeout
    return Promise.race([ocrPromise, timeoutPromise]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error extracting text with Google Vision:", errorMessage);

    // Return user-friendly error message instead of throwing
    if (errorMessage.includes("RESOURCE_EXHAUSTED")) {
      return "Google Vision API quota exceeded. Please try again later.";
    } else if (errorMessage.includes("PERMISSION_DENIED")) {
      return "Google Vision API permission denied. Please check your Google Cloud credentials.";
    } else if (errorMessage.includes("INVALID_ARGUMENT")) {
      return "The image format is not supported or the image is corrupted.";
    } else {
      return `Could not extract text from image: ${errorMessage}`;
    }
  }
}

/**
 * Extract text from a PDF using Google Vision Document OCR
 * @param {string} pdfPath Path to the PDF file
 * @returns {Promise<string>} Extracted text
 */
export async function extractTextFromPdf(pdfPath) {
  const client = getVisionClient();

  if (!client) {
    console.warn(
      "Google Vision client not initialized, cannot extract text from PDF"
    );
    return "Google Vision OCR service not available. Please check your Google Cloud credentials.";
  }

  try {
    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      console.error(`PDF file not found: ${pdfPath}`);
      return `Error: PDF file not found: ${path.basename(pdfPath)}`;
    }

    // Read PDF content
    const fullPath = path.resolve(pdfPath);
    const fileStats = fs.statSync(fullPath);

    // Check file size to avoid processing very large PDFs
    const maxFileSizeBytes = 20 * 1024 * 1024; // 20 MB max
    if (fileStats.size > maxFileSizeBytes) {
      console.warn(
        `PDF file too large (${Math.round(
          fileStats.size / (1024 * 1024)
        )} MB), may fail OCR`
      );
      return "PDF file too large for direct OCR. Using alternative extraction methods.";
    }

    const pdfContent = fs.readFileSync(fullPath);
    // console.log(`Extracting text from PDF:${pdfContent}`);

    // Perform OCR with Google Vision with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("OCR request timed out")), 45000); // 45 second timeout for PDFs
    });

    const ocrPromise = client
      .documentTextDetection(pdfContent)
      .then(([result]) => {
        const fullText = result.fullTextAnnotation?.text || "";
        console.log("Full text extracted from PDF:", fullText);

        if (!fullText || fullText.trim().length === 0) {
          console.log("No text detected in PDF");
          return "No text detected in PDF. The document may be scanned or contain only images.";
        }

        console.log(
          `Successfully extracted ${fullText.length} characters from PDF`
        );
        return fullText;
      });

    // Race between OCR and timeout
    return Promise.race([ocrPromise, timeoutPromise]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      "Error extracting text from PDF with Google Vision:",
      errorMessage
    );

    // Return user-friendly error message instead of throwing
    if (errorMessage.includes("RESOURCE_EXHAUSTED")) {
      return "Google Vision API quota exceeded. Please try again later.";
    } else if (errorMessage.includes("PERMISSION_DENIED")) {
      return "Google Vision API permission denied. Please check your Google Cloud credentials.";
    } else if (errorMessage.includes("INVALID_ARGUMENT")) {
      return "The PDF format is not supported or the file is corrupted.";
    } else if (errorMessage.includes("timed out")) {
      return "OCR request timed out. The PDF may be too complex or large. Try breaking it into smaller files.";
    } else {
      return `Could not extract text from PDF: ${errorMessage}`;
    }
  }
}

/**
 * Extract text from any supported file type (PDF, images, etc.)
 * @param {string} filePath Path to the file
 * @returns {Promise<string>} Extracted text
 */
export async function extractTextFromFile(filePath) {
  try {
    const extension = path.extname(filePath).toLowerCase();

    // Use appropriate extraction method based on file type
    if (extension === ".pdf") {
      return await extractTextFromPdf(filePath);
    } else if (
      [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff"].includes(
        extension
      )
    ) {
      return await extractTextFromImage(filePath);
    } else {
      console.warn(`Unsupported file type for Google Vision OCR: ${extension}`);
      return `File type ${extension} is not supported for OCR. Supported formats include PDF and common image formats (JPG, PNG, etc).`;
    }
  } catch (error) {
    console.error("Error in extractTextFromFile:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error extracting text from file: ${errorMessage}`;
  }
}

/**
 * Check if Google Vision is available for use
 * @returns {boolean} Whether Google Vision can be used
 */
export function isVisionAvailable() {
  return getVisionClient() !== null;
}
