import { getIO } from "../socket.js";

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
  } catch (error) {
    console.error("Error sending document to admin:", error);
    return res.status(500).json({
      error: "Failed to send document to admin",
      message: error.message,
    });
  }
};
