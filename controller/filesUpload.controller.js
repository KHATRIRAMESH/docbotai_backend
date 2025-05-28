import fs from "fs/promises";
import { db } from "../db/connection.js";
import { documents } from "../db/schema.js";
import { uploadToCloudinary } from "../services/uploadToCloudinary.js";

export const filesUpload = async (req, res) => {
    console.log("Files upload controller called");
    console.log("Request body:", req.body);
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: "No files uploaded",
        message: "Please upload documents",
      });
    }

    const documentUrl = [];

    for (const file of files) {
      const fileBuffer = await fs.readFile(file.path);
      const result = await uploadToCloudinary(fileBuffer, file.mimetype);
      documentUrl.push(result);
    }

    const secureUrl = documentUrl.map((doc) => doc.secure_url);
    // console.log("Uploaded documents:", secure_url);

    const { userId, loanType, fullName, permanentAddress, currentAddress } =
      req.body;

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
    console.error("Error uploading files:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something went wrong while uploading files",
    });
  }
};
