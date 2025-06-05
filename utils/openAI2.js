// Import necessary modules
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import "dotenv/config";

// Initialize the OpenAI client with better error handling
let openai = null;

try {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey && apiKey.startsWith("sk-") && apiKey.length > 20) {
    openai = new OpenAI({ apiKey });
    console.log("OpenAI client initialized successfully");
  } else {
    console.warn("Invalid or missing OpenAI API key format");
  }
} catch (error) {
  console.error("Error initializing OpenAI client:", error);
}

// Function to determine if the OpenAI API key is valid
export const isValidApiKey = () => {
  // Check if we have a valid OpenAI client instance
  return openai !== null;
};

// Function to get or initialize the OpenAI client
export const getOpenAIClient = () => {
  if (!openai) {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey && apiKey.startsWith("sk-") && apiKey.length > 20) {
        openai = new OpenAI({ apiKey });
        console.log("OpenAI client initialized on demand");
      } else {
        console.warn(
          "Cannot initialize OpenAI client - invalid API key format"
        );
        return null;
      }
    } catch (error) {
      console.error("Error initializing OpenAI client on demand:", error);
      return null;
    }
  }
  return openai;
};

/**
 * Enhanced function for using OpenAI Vision capabilities to extract text from images and PDFs
 * This function is optimized for document extraction with better prompts and error handling
 * @param {string} filePath Path to the image or PDF file
 * @param {string} [mode] Optional processing mode (e.g., 'first_page' to focus on first page only)
 * @returns {Promise<{extractedText: string, structuredData: Record<string, string>}>}
 */
export const enhanceWithOpenAIVision = async (filePath, mode) => {
  try {
    if (!isValidApiKey()) {
      console.log(
        "[VISION] No valid OpenAI API key found, using fallback extraction"
      );
      return {
        extractedText: `This text would typically be extracted using OpenAI Vision API. File: ${path.basename(
          filePath
        )}`,
        structuredData: {
          document_type: "Unknown",
          raw_extracted_text: `This text would typically be extracted using OpenAI Vision API. File: ${path.basename(
            filePath
          )}`,
        },
      };
    }

    // File existence check
    if (!fs.existsSync(filePath)) {
      console.error(`[VISION] File does not exist: ${filePath}`);
      return {
        extractedText: `Error: File not found at ${path.basename(filePath)}`,
        structuredData: {
          error: "File not found",
          raw_extracted_text: `Error: File not found at ${path.basename(
            filePath
          )}`,
        },
      };
    }

    // Get file stats for debugging
    const fileStats = fs.statSync(filePath);
    const fileSizeKB = Math.round(fileStats.size / 1024);
    console.log(
      `[VISION] Processing file: ${path.basename(
        filePath
      )}, size: ${fileSizeKB}KB`
    );

    // Read file as base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64Image = fileBuffer.toString("base64");
    const fileType = path.extname(filePath).toLowerCase();

    // Determine the correct MIME type with better handling
    let mimeType;
    if (fileType === ".pdf") {
      mimeType = "application/pdf";
    } else if ([".jpg", ".jpeg"].includes(fileType)) {
      mimeType = "image/jpeg";
    } else if (fileType === ".png") {
      mimeType = "image/png";
    } else if (fileType === ".gif") {
      mimeType = "image/gif";
    } else if (fileType === ".webp") {
      mimeType = "image/webp";
    } else if (fileType === ".tif" || fileType === ".tiff") {
      mimeType = "image/tiff";
    } else if (fileType === ".bmp") {
      mimeType = "image/bmp";
    } else {
      // Default to JPEG for any other image formats (OpenAI Vision API will still process them)
      console.log(
        `[VISION] Unknown file extension '${fileType}', defaulting to JPEG mime type`
      );
      mimeType = "image/jpeg";
    }

    console.log(
      `[VISION] Using MIME type: ${mimeType} for file: ${path.basename(
        filePath
      )}`
    );

    // Set up appropriate prompt based on mode
    let promptText =
      "Extract ALL visible text from this document image with perfect accuracy.";

    if (mode === "first_page") {
      promptText =
        "Extract ALL visible text from the first page of this document with perfect accuracy. I need every single word, number, and character visible in the image - nothing should be missed or summarized.";
    } else if (mode === "recovery_mode") {
      promptText =
        "This is an important document image that needs careful text extraction. Please extract ALL visible text with maximum accuracy, even if some parts are unclear or difficult to read. Pay special attention to form fields, numbers, dates, and proper names.";
    } else {
      promptText =
        "Extract ALL visible text from this document image with perfect accuracy. I need every single word, number, and character visible in the image - nothing should be missed or summarized. Maintain the document's structure where possible. After extracting the raw text, identify key field-value pairs that would be useful for data extraction.";
    }

    // Try direct vision extraction first for images
    let openAIResponse;

    try {
      console.log(
        `[VISION] Sending request to OpenAI Vision API for ${path.basename(
          filePath
        )}`
      );
      const client = getOpenAIClient();
      if (!client) {
        throw new Error("OpenAI client not available");
      }

      openAIResponse = await client.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          {
            role: "system",
            content: `You are a document analysis expert specialized in precise text extraction and data recognition from images and documents. Your primary goal is to extract ALL text visible in the document with perfect accuracy, preserving formatting whenever possible.

IMPORTANT INSTRUCTIONS:
1. Extract ALL visible text in the image, no matter how small or where it appears
2. Pay special attention to numerical values, dates, and proper names
3. For forms and structured documents, identify field labels and their corresponding values
4. For financial documents, carefully extract all monetary amounts, percentages, and financial terms
5. For ID cards and official documents, extract all information including document numbers, dates, and personal details
6. Do not omit any visible text, even if it seems unimportant
7. Maintain the original structure of the document where possible
8. When text is unclear, indicate uncertainty with [?]
9. Read text in tables row by row, preserving the table structure
10. Capture headers, footers, watermarks, and any visible metadata`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: promptText,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
      });
    } catch (visionError) {
      console.error("Error with direct OpenAI Vision API call:", visionError);

      // Check if this is a MIME type error - if so, try as base64 without MIME type
      if (
        visionError instanceof Error &&
        visionError.message &&
        visionError.message.includes("MIME")
      ) {
        console.log(
          "MIME type error detected, trying alternative approach with content detection..."
        );

        // Try a different approach with the latest model
        try {
          const client = getOpenAIClient();
          if (!client) {
            throw new Error("OpenAI client not available");
          }
          openAIResponse = await client.chat.completions.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
            messages: [
              {
                role: "system",
                content: `You are a document analysis expert specialized in precise text extraction and data recognition from images and documents. Your primary goal is to extract ALL text visible in the document with perfect accuracy, preserving formatting whenever possible.

IMPORTANT INSTRUCTIONS:
1. Extract ALL visible text in the image, no matter how small or where it appears
2. Pay special attention to numerical values, dates, and proper names
3. For forms and structured documents, identify field labels and their corresponding values
4. For financial documents, carefully extract all monetary amounts, percentages, and financial terms
5. For ID cards and official documents, extract all information including document numbers, dates, and personal details
6. Do not omit any visible text, even if it seems unimportant
7. Maintain the original structure of the document where possible
8. When text is unclear, indicate uncertainty with [?]
9. Read text in tables row by row, preserving the table structure
10. Capture headers, footers, and any visible metadata`,
              },
              {
                role: "user",
                content:
                  "Please extract all text from this document and identify key information fields.",
              },
              {
                role: "assistant",
                content:
                  "I'll extract text and identify key information from the document. Please share the document so I can analyze it.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Here's the document. Please extract all text content and identify any structured data:",
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`, // Defaulting to jpeg for the fallback
                    },
                  },
                ],
              },
            ],
            max_tokens: 4000,
          });
        } catch (secondError) {
          console.error("Second attempt also failed:", secondError);
          throw secondError;
        }
      } else {
        // If not a MIME type error, rethrow
        throw visionError;
      }
    }

    // Process the response to extract both raw text and structured data
    if (
      !openAIResponse ||
      !openAIResponse.choices ||
      !openAIResponse.choices[0] ||
      !openAIResponse.choices[0].message
    ) {
      throw new Error("Invalid OpenAI response format");
    }

    const content = openAIResponse.choices[0].message.content || "";

    // Try to parse structured data from the response
    let structuredData = {};
    const extractedText = content.trim();

    try {
      // Look for patterns like "Field: Value" in the extracted text
      const lines = extractedText.split("\n");
      lines.forEach((line) => {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match && match[1] && match[2]) {
          const key = match[1].trim().toLowerCase().replace(/\s+/g, "_");
          const value = match[2].trim();
          structuredData[key] = value;
        }
      });

      // Always ensure we have the raw text available
      structuredData["raw_extracted_text"] = extractedText;

      // Try to determine document type
      if (!structuredData["document_type"]) {
        if (extractedText.toLowerCase().includes("purchase agreement")) {
          structuredData["document_type"] = "Purchase Agreement";
        } else if (extractedText.toLowerCase().includes("lease")) {
          structuredData["document_type"] = "Lease Agreement";
        } else if (
          extractedText.toLowerCase().includes("title") ||
          extractedText.toLowerCase().includes("deed")
        ) {
          structuredData["document_type"] = "Title/Deed";
        } else {
          structuredData["document_type"] = "General Document";
        }
      }
    } catch (parseError) {
      console.error("Error parsing structured data:", parseError);
      structuredData = {
        raw_extracted_text: extractedText,
        document_type: "Unknown",
      };
    }

    return {
      extractedText,
      structuredData,
    };
  } catch (error) {
    console.error("Error using OpenAI Vision API:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check for MIME type issues
    if (errorMessage.includes("MIME") || errorMessage.includes("mime")) {
      return {
        extractedText: `Error processing document: Invalid MIME type. Only image types are supported.`,
        structuredData: {
          error: "Invalid MIME type. Only image types are supported.",
          document_type: "Error",
          solution:
            "Try converting the file to a supported image format like JPG or PNG.",
        },
      };
    }

    return {
      extractedText: `Error processing document: ${errorMessage}`,
      structuredData: {
        error: errorMessage,
        document_type: "Error",
      },
    };
  }
};

/**
 * Extract structured form fields from raw document text
 * @param {string} text Raw document text
 * @returns {Promise<Record<string, string>>} Structured data as key-value pairs
 */
export const extractStructuredData = async (text) => {
  try {
    if (!isValidApiKey()) {
      console.log(
        "No valid OpenAI API key found, using fallback structured data"
      );
      // Fallback structured data if OpenAI API key is not valid
      return {
        raw_extracted_text: text,
        document_type: "Unknown",
      };
    }

    const client = getOpenAIClient();
    if (!client) {
      throw new Error("OpenAI client not available");
    }
    const response = await client.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        {
          role: "system",
          content: `You are a document analysis expert specialized in extracting structured data from financial and loan application documents.
          
Your task is to extract all information relevant to financial analysis, paying special attention to personal information, income details, expenses, assets, liabilities, and other financial data.

IMPORTANT INSTRUCTIONS:
1. For any field that cannot be found in the document, use "N/A" as the value.
2. Convert all financial values to include the appropriate currency symbol (e.g., "$5,000" instead of "5000").
3. Be thorough in examining the document for relevant information - look for all possible mentions or references.
4. If a value is mentioned multiple times, use the most specific or detailed instance.
5. Analyze the document type to determine the most appropriate values (e.g., pay slips, bank statements, loan applications).
6. For complex fields, extract and format the most complete information available.
7. If a field appears to have multiple potential values, choose the most likely one based on context.
8. For fields like allowances, look for any references to medical allowance, HRA, other allowances, etc.

Return a JSON object where each key is a specific field extracted from the document. 
- The key names should reflect the actual fields found in the text (e.g., "account_balance", "employer_name", "HRA_allowance").
- Avoid using "N/A" — just omit fields if they’re not available.

`, // Note: In JS, multiline strings are created with backticks.
        },
        {
          role: "user",
          content: `Please extract all financial and personal information fields from this document text and return them as JSON. Use "N/A" for any fields not found in the document. Always include the raw_extracted_text field containing the full document text.

For financial documents like pay slips or salary statements:
- Identify gross_wage_per_month from terms like "Gross Salary", "Basic Salary", "Total Earnings"
- Look for allowance_income in terms like "HRA", "Medical Allowance", "Other Allowances"
- Identify tax from terms like "Tax", "Income Tax", "Tax Deduction"
- Look for net_wage_per_month in terms like "Net Salary", "Take Home Pay", "Net Amount"
- If employers are mentioned, extract as name_of_last_employer

For address information, extract the most complete address available as address.

Text to analyze: 
${text}`, // Note: In JS, multiline strings are created with backticks.
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0, // Use low temperature for more consistent extraction
    });

    // Parse the JSON response
    try {
      const content = response.choices[0].message.content || "{}";
      const structuredData = JSON.parse(content);

      // Ensure we always include the raw text
      structuredData.raw_extracted_text = text;

      // Convert to string values and ensure "N/A" for missing fields
      const stringifiedData = {};

      // List of expected fields
      const expectedFields = [
        "first_name",
        "middle_name",
        "last_name",
        "sex",
        "dob",
        "drivers_licence_number",
        "passport_number",
        "medicare_number",
        "address",
        "gross_wage_per_month",
        "tax",
        "net_wage_per_month",
        "super_per_month",
        "rental_property_income",
        "dividend_income",
        "interest_income",
        "allowance_income",
        "other_investment_income",
        "grocery_expenses_per_month",
        "education_expenses",
        "mortgage_expenses",
        "travel_expenses",
        "other_expenses",
        "main_residence_address",
        "main_residence_purchase_price",
        "number_of_investment_properties",
        "investment_property_purchase_price",
        "car_model_make",
        "car_purchase_price",
        "share_portfolio_market_value",
        "mortgage_outstanding",
        "credit_card_limit",
        "personal_loan_outstanding",
        "car_loan_outstanding",
        "other_loans_outstanding",
        "number_of_dependents",
        "age_of_dependents",
        "hecs_fees_outstanding",
        "name_of_last_employer",
        "referee_name",
        "document_type",
        "raw_extracted_text",
      ];

      // Ensure all expected fields exist with either their value or "N/A"
      // for (const field of expectedFields) {
      //   if (
      //     structuredData[field] !== undefined &&
      //     structuredData[field] !== null &&
      //     String(structuredData[field]).trim() !== ""
      //   ) {
      //     stringifiedData[field] = String(structuredData[field]).trim();
      //   } else {
      //     stringifiedData[field] = "N/A";
      //   }
      // }

      // Add any additional fields that might have been extracted
      for (const [key, value] of Object.entries(structuredData)) {
        if (
          !expectedFields.includes(key) &&
          value !== undefined &&
          value !== null
        ) {
          stringifiedData[key] = String(value);
        }
      }

      console.log(
        `Successfully extracted structured data with ${
          Object.keys(stringifiedData).length
        } fields`
      );
      return structuredData;
    } catch (parseError) {
      console.error("Error parsing structured data JSON:", parseError);
      return {
        raw_extracted_text: text,
        document_type: "Unknown",
        error: "Failed to parse structured data",
      };
    }
  } catch (error) {
    console.error("Error extracting structured data:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      raw_extracted_text: text,
      error: errorMessage,
      document_type: "Error",
    };
  }
};

// Export functions for use in other modules
// module.exports = {
//   isValidApiKey,
//   getOpenAIClient,
//   enhanceWithOpenAIVision,
//   extractStructuredData,
// };
