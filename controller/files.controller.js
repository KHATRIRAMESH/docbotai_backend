import { uploadToCloudinary } from "../services/uploadToCloudinary.js";
import { getIO } from "../socket.js";

export const uploadDocument = async (req, res) => {
  console.log("Uploading document...");
  try {
    const files = req.files;
    const documentUrl = [];
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: "No files uploaded",
        message: "Please upload at least one document",
      });
    }
    for (const file of files) {
      const result = await uploadToCloudinary(file.buffer, file.mimetype);
      documentUrl.push(result);
    }

    console.log("Document URL:", documentUrl);
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
