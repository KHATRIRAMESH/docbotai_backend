import fs from "fs/promises";
import { db } from "../db/connection.js";
import { documents } from "../db/schema.js";
import { uploadToCloudinary } from "../services/uploadToCloudinary.js";
import path from "path";


export const verifyAndUploadDocuments = async (req, res) => {
  try {
    const {
      userId,
      loanType,
      fullName,
      permanentAddress,
      currentAddress,
      // filePaths,
    } = req.body;

    const filePaths = [
      "http://localhost:8000/temp//uploads/Proposal_Defense_Evaluation_And_Supervisor_Assignments_Software_Engineering.pdf",
    ];

    if (!filePaths || filePaths.length === 0) {
      return res.status(400).json({
        error: "No files to upload",
        message: "filePaths array is required",
      });
    }

    const documentUrl = [];

    for (const relativePath of filePaths) {
      const filePath = path.join(
        process.cwd(),
        "temp",
        "uploads",
        path.basename(relativePath)
      );

      console.log("File path to read:", filePath);
      const fileBuffer = await fs.readFile(filePath);
      // const mimeType = getMimeTypeFromExtension(filePath); // helper you may define
      const result = await uploadToCloudinary(fileBuffer);
      documentUrl.push(result);
    }

    const secureUrl = documentUrl.map((doc) => doc.secure_url);
    // console.log("Uploaded documents:", secure_url);

    const newFile = await db
      .insert(documents)
      .values({
        userId,
        loanType,
        fullName,
        permanentAddress,
        currentAddress,
        secureUrl,
      })
      .returning();
    console.log("New file record:", newFile);

    return res.status(200).json(newFile);
  } catch (error) {
    console.error("Error verifying and uploading files:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something went wrong while uploading verified documents",
    });
  }
};
