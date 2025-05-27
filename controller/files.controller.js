import { db } from "../db/connection.js";
import { documents } from "../db/schema.js";
import { uploadToCloudinary } from "../services/uploadToCloudinary.js";
import { getIO } from "../socket.js";
import fs from "fs/promises";

export const uploadDocument = async (req, res) => {
  console.log("Uploading document...");
  try {
    const files = req.files;
    console.log("Files received:", files);
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: "No files uploaded",
        message: "Please upload at least one document",
      });
    }
    0;
    const documentUrl = [];

    for (const file of files) {
      const fileBuffer = await fs.readFile(file.path);
      const result = await uploadToCloudinary(fileBuffer, file.mimetype);
      documentUrl.push(result);
    }

    console.log("Document URL:", documentUrl);

    const newFile = await db
      .insert(documents)
      .values({
        applicationId: req.body.applicationId,
        documentType: req.body.documentType,
        fileUrl: documentUrl[0].secure_url, // Assuming you want to store the first uploaded file URL
        fileName: req.body.fileName || documentUrl[0].original_filename,
        fileSize: documentUrl[0].bytes,
        mimeType: documentUrl[0].format,
        status: "pending", // Default status
      })
      .returning({
        id: documents.id,
        applicationId: documents.applicationId,
        documentType: documents.documentType,
        fileUrl: documents.fileUrl,
        fileName: documents.fileName,
        fileSize: documents.fileSize,
        mimeType: documents.mimeType,
        status: documents.status,
        uploadedAt: documents.uploadedAt,
      });

    return res.status(200).json(documentUrl);
  } catch (error) {
    console.error("Error uploading document:", error);
    return res.status(500).json({
      error: "Failed to upload document",
      message: error.message,
    });
  }
  //notify room after successful upload
  //   const io = getIO();
  //   const roomName = `room-user-${userId}`;
  //   io.to(roomName).emit("document-uploaded", {
  //     userId,
  //     documentName,
  //     submittedAt: new Date().toISOString(),
  //   });
  //   res.status(200).json({ message: "Document uploaded and admin notified" });
};
