import { db } from "../db/connection.js";
import { documents } from "../db/schema.js";
import { uploadToCloudinary } from "../services/uploadToCloudinary.js";
import { getIO } from "../socket.js";
import fs from "fs/promises";

export const uploadDocument = async (req, res) => {
  try {
    const files = req.files;
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

    const secureUrl = documentUrl.map((doc) => doc.secure_url);
    // console.log("Uploaded documents:", secure_url);

    console.log("Body: ", req.body);

    const { loanType, fullName, permanentAddress, currentAddress } = req.body;

    const newFile = await db
      .insert(documents)
      .values({
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
