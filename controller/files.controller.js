import { uploadToCloudinary } from "../services/uploadToCloudinary.js";
import { getIO } from "../socket.js";

export const uploadDocument = async (req, res) => {
  //   const { userId, documentName } = req.body;
  console.log("Request body:", req.body);
  const files = req.files;

  console.log("Request file:", req.file);
  try {
    const documentUrl = await uploadToCloudinary(req.file);
    console.log("Document URL:", documentUrl);
  } catch (error) {}
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
