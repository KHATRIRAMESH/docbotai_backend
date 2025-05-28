import { db } from "../db/connection.js";
import { documents } from "../db/schema.js";
import { uploadToCloudinary } from "../services/uploadToCloudinary.js";
import { getIO } from "../socket.js";
import fs from "fs/promises";

export const fileSentToAdmin = async (req, res) => {
  try {
    const { loanType, fullName, permanentAddress, currentAddress } = req.body;
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: "No files uploaded",
        message: "Please upload documents",
      });
    }

    const files_url = [];
    // Construct the full URL
    const protocol = req.protocol; // http or https
    const host = req.get("host"); // localhost:3000 or your domain
    files.forEach((file) => {
      let file_url = `${protocol}://${host}/temp//uploads/${file.filename}`;
      files_url.push(file_url);
      console.log("file url with the server endpoint: ", file_url);
    });

    // Emit an event to notify the admin about the new document submission
    const io = getIO();
    const userId = req.body.userId; // Assuming userId is sent in the request body
    io.to("admin-room").emit("new-document-submission", {
      userId,
      loanType,
      fullName,
      permanentAddress,
      currentAddress,
      files: files_url,
    });

    // const io = getIO();

    // const documentUrl = [];

    // for (const file of files) {
    //   const fileBuffer = await fs.readFile(file.path);
    //   const result = await uploadToCloudinary(fileBuffer, file.mimetype);
    //   documentUrl.push(result);
    // }

    // const secureUrl = documentUrl.map((doc) => doc.secure_url);
    // // console.log("Uploaded documents:", secure_url);

    // console.log("Body: ", req.body);

    //

    // const newFile = await db
    //   .insert(documents)
    //   .values({
    //     loanType,
    //     fullName,
    //     permanentAddress,
    //     currentAddress,
    //     secureUrl,
    //   })
    //   .returning();
    // console.log("New file record:", newFile);

    // return res.status(200).json(newFile);
  } catch (error) {
    console.error("Error uploading document:", error);
    return res.status(500).json({
      error: "Failed to upload document",
      message: error.message,
    });
  }
};
