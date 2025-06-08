import fs from "fs/promises"; // For async file operations if needed later
import { db } from "../db/connection.js";
import { documents, generatedFiles } from "../db/schema.js";
import { uploadToCloudinary } from "../services/uploadToCloudinary.js";
import { processGoogleVisionOutput } from "../utils/extractingFuntion.js"; // Ensure this is the correct path

import path from "path";
import { processMyFile } from "../services/filesProcessingWithGoogleVision/fileProcessing.js"; // Correct import
import { convertPdfToImages } from "../services/pdfToImage.js";
import { getPngFilePaths } from "../utils/pdfFilePath.js";
import { generateExcelDocument } from "../services/documentsGeneratingServices/excelSheetGenerating.js";

export const verifyAndUploadDocuments = async (req, res) => {
  try {
    console.log("Received files for verification and upload:", req.body);
    const { userId, loanType, fullName, permanentAddress, files, status } =
      req.body;

    console.log(Array.isArray(files));

    const pathURl = [];
    const projectRoot = path.resolve();
    // console.log("Project root directory:", projectRoot);
    files.map((file) => {
      // const filePath = file.path;
      const relativeFilePath = file.split("8000/")[1];
      console.log(relativeFilePath);
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

    for (const element of pdfFilePaths) {
      if (element.endsWith(".pdf")) {
        const result = await convertPdfToImages(element, "temp/pdf2Images");
        imageFilePaths.push(...result); // Add converted image paths to the array
        console.log("Converted PDF to images:", result);
        // process result if needed
      }
    }

    // const documentUrls = []; // Renamed to plural for clarity if multiple

    let extractedTextResults = ""; // Store results of text extraction

    //extracting text from each files and then storing the result in extractedTextResults
    for (const relativePath of imageFilePaths) {
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
    }
    const openAIResult = await processGoogleVisionOutput(extractedTextResults);
    console.log("Structured Data Result:", openAIResult);

    const excelResultPath = await generateExcelDocument(openAIResult,fullName);
    console.log("Excel document generated:", excelResultPath);

    // const excelSheetPath = path.relative(projectRoot, excelResultPath); // Use path.resolve for absolute path
    // console.log("Relative path to the generated excel sheet: ", excelSheetPath);

    const protocol = req.protocol; // http or https
    const host = req.get("host");
    const excelSheetUrl = `${protocol}://${host}/${excelResultPath}`;
    // for (const imagePath of result) {
    // }
    const absoluteExcelPath = path.resolve(projectRoot, excelResultPath);
    const fileBuffer = await fs.readFile(absoluteExcelPath);

    console.log("File buffer read successfully for upload:", fileBuffer);

    const secureUrlArray = []; // Array to hold secure URLs of uploaded files
    const uploadResult = await uploadToCloudinary(fileBuffer);
    console.log("Upload result:", uploadResult);
    secureUrlArray.push(uploadResult.secure_url);

    // Uncomment and use this block once you are satisfied with file processing
    await db
      .insert(generatedFiles)
      .values({ excelSheetPath: excelSheetUrl });
    const newFile = await db
      .insert(documents)
      .values({
        userId,
        loanType,
        fullName,
        permanentAddress: "New York", // Assuming you want to keep this static for now
        currentAddress: "New York", // Assuming you want to keep this static for now
        secureUrl: secureUrlArray, // Ensure your schema can handle an array of URLs
      })
      .returning();
    console.log("New file record:", newFile);

    //cleaning up the temporary files after processing
    // for (const url of imageFilePaths) {
    //   await fs.unlink(url, (error) => {
    //     if (error) {
    //       console.error(`Error deleting file ${url}:`, error);
    //     } else {
    //       console.log(`File ${url} deleted successfully`);
    //     }
    //   });
    // }

    return res.status(200).json({
      message: "Files verified and uploaded successfully",
      // extractedTextResults: localFilePaths.map((p) => ({
      //   filename: path.basename(p),
      //   text: "OCR result logged to console, check server logs", // Or pass it back if needed
      // })),
      uploadedUrls: excelSheetUrl,
    });
  } catch (error) {
    console.error("Error verifying and uploading files:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something went wrong while uploading verified documents",
    });
  }
};
