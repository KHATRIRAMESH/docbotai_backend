import fs from "fs/promises"; // For async file operations if needed later
import { db } from "../db/connection.js";
import { documents } from "../db/schema.js";
import { uploadToCloudinary } from "../services/uploadToCloudinary.js";
import { processGoogleVisionOutput } from "../utils/extractingFuntion.js"; // Ensure this is the correct path

import path from "path";
import { processMyFile } from "../services/filesProcessingWithGoogleVision/fileProcessing.js"; // Correct import
import { convertPdfToImages } from "../services/pdfToImage.js";
import { getPngFilePaths } from "../utils/pdfFilePath.js";
import { generateExcelDocument } from "../services/documentsGeneratingServices/excelSheetGenerating.js";

export const verifyAndUploadDocuments = async (req, res) => {
  try {
    // const {
    //   userId,
    //   loanType,
    //   fullName,
    //   permanentAddress,
    //   currentAddress,
    //   filePaths, // If you're getting actual file paths from client/request
    // } = req.body;
    const { loanType, fullName, permanentAddress, currentAddress } = req.body;
    const files = req.files;

    const pathURl = [];
    const projectRoot = path.resolve();
    files.map((file) => {
      const filePath = file.path;
      const relativeFilePath = path.relative(projectRoot, filePath);
      pathURl.push(relativeFilePath);
    });
    console.log("Relative paths of uploaded files:", pathURl);

    if (!pathURl || pathURl.length === 0) {
      return res.status(400).json({
        error: "No files to upload",
        message: "filePaths array is required",
      });
    }

    const imageFilePaths = [];
    const pdfFilePaths = [];

    for (const url of pathURl) {
      if (url.endsWith(".pdf")) {
        pdfFilePaths.push(url);
      } else {
        imageFilePaths.push(url);
      }
    }
    console.log("Image file paths:", imageFilePaths);
    console.log("PDF file paths:", pdfFilePaths);
    // Process image files directly

    for (const element of pathURl) {
      if (element.endsWith(".pdf")) {
        const result = await convertPdfToImages(element, "temp/pdf2Images");
        imageFilePaths.push(...result); // Add converted image paths to the array
        console.log("Converted PDF to images:", result);
        // process result if needed
      }
    }

    // const documentUrls = []; // Renamed to plural for clarity if multiple

    let extractedTextResults = ""; // Store results of text extraction

    for (const relativePath of imageFilePaths) {
      //now the png files in the temp/pdf2Images folder are ready to be processed
      const extractedTextResult = await processMyFile(relativePath);
      extractedTextResults += extractedTextResult;

      // --- Handle the case where Google Vision found no text ---
      if (
        extractedTextResult.includes("No text detected in PDF.") ||
        extractedTextResult.includes("Error: Image file not found:")
      ) {
        console.warn(
          `Skipping upload for ${relativePath} due to OCR failure or file not found.`
        );
      }

      const openAIResult = await processGoogleVisionOutput(
        extractedTextResults
      );
      console.log("Structured Data Result:", openAIResult);

      const excelResult = await generateExcelDocument(openAIResult);
      console.log("Excel document generated:", excelResult);

      // const absoluteFilePath = path.resolve(relativePath); // Use path.resolve for absolute path
      // console.log("Attempting to process local file:", absoluteFilePath);

      // for (const imagePath of result) {
      // }

      // const fileBuffer = await fs.readFile(absoluteFilePath);

      // const uploadResult = await uploadToCloudinary(fileBuffer, {
      /* optional cloudinary options like resource_type */
      // });
      // documentUrls.push(uploadResult.secure_url);
    }

    // const secureUrlArray = documentUrls; // Array of secure_url strings

    // Uncomment and use this block once you are satisfied with file processing
    // const newFile = await db
    //   .insert(documents)
    //   .values({
    //     userId,
    //     loanType,
    //     fullName,
    //     permanentAddress,
    //     currentAddress,
    //     secureUrl: secureUrlArray, // Ensure your schema can handle an array of URLs
    //   })
    //   .returning();
    // console.log("New file record:", newFile);

    return res.status(200).json({
      message: "Files verified and uploaded successfully",
      extractedTextResults: localFilePaths.map((p) => ({
        filename: path.basename(p),
        text: "OCR result logged to console, check server logs", // Or pass it back if needed
      })),
      uploadedUrls: secureUrlArray,
    });
  } catch (error) {
    console.error("Error verifying and uploading files:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something went wrong while uploading verified documents",
    });
  }
};
