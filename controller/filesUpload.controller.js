import fs from "fs/promises"; // For async file operations if needed later
import { db } from "../db/connection.js";
import { documents } from "../db/schema.js";
import { uploadToCloudinary } from "../services/uploadToCloudinary.js";

import path from "path";
import { processMyFile } from "../services/filesProcessingWithGoogleVision/fileProcessing.js"; // Correct import
import { convertPdfToImages } from "../services/pdfToImage.js";

export const verifyAndUploadDocuments = async (req, res) => {
  try {
    const {
      userId,
      loanType,
      fullName,
      permanentAddress,
      currentAddress,
      // filePaths, // If you're getting actual file paths from client/request
    } = req.body;

    // --- IMPORTANT: Adjust this based on where your file is truly located ---
    // Option 1: File is directly in 'temp/uploads' relative to your project root
    const localFilePaths = [
      "temp/uploads/The_Verdict.pdf", // This assumes your project has a 'temp/uploads' folder
    ];

    // Option 2: If the files are uploaded to a temporary server directory *before* this function runs,
    // and `req.body.filePaths` contains just the filenames/relative paths
    // e.g., if an earlier multer middleware saves them to /uploads/
    // const uploadedFilenames = req.body.fileNames; // Example: ['The_Verdict.pdf']
    // const uploadDir = path.join(process.cwd(), 'uploads'); // Assuming files are in /uploads/
    // const localFilePaths = uploadedFilenames.map(filename => path.join(uploadDir, filename));

    if (!localFilePaths || localFilePaths.length === 0) {
      return res.status(400).json({
        error: "No files to upload",
        message: "filePaths array is required",
      });
    }

    const documentUrls = []; // Renamed to plural for clarity if multiple

    for (const relativePath of localFilePaths) {
      const absoluteFilePath = path.resolve(relativePath); // Use path.resolve for absolute path
      console.log("Attempting to process local file:", absoluteFilePath);

      const result = await convertPdfToImages(absoluteFilePath, "temp/pdf2Images");
      console.log("PDF to image conversion result:", result);

      // --- CRITICAL: AWAIT the result of the async function ---
      const extractedTextResult = await processMyFile(absoluteFilePath);
      console.log("Result of file processing:\n", extractedTextResult);

      // --- Handle the case where Google Vision found no text ---
      if (
        extractedTextResult.includes("No text detected in PDF.") ||
        extractedTextResult.includes("Error: Image file not found:")
      ) {
        console.warn(
          `Skipping upload for ${relativePath} due to OCR failure or file not found.`
        );
        // You might want to store this warning/error in your DB or return it to the user
        // For now, let's just continue or explicitly handle it
        // return res.status(422).json({
        //     error: "Document processing failed",
        //     message: `Failed to extract text from ${path.basename(relativePath)}: ${extractedTextResult}`
        // });
      }

      // --- If you still want to upload the original file regardless of OCR result ---
      // Read the file buffer for upload to Cloudinary
      const fileBuffer = await fs.readFile(absoluteFilePath);
      // You might need a mime type for Cloudinary, e.g., 'application/pdf' or 'image/png'
      // You can infer it from the extension or use a library like 'mime-types'
      const uploadResult = await uploadToCloudinary(fileBuffer, {
        /* optional cloudinary options like resource_type */
      });
      documentUrls.push(uploadResult.secure_url);
    }

    // --- Assuming you want to proceed with DB insertion even if OCR failed for some files ---
    // If you want to skip DB insertion for files that failed OCR, move this inside the loop
    const secureUrlArray = documentUrls; // Array of secure_url strings

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
