import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(file) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64String = buffer.toString("base64");
  const dataURI = `data:${file.type};base64,${base64String}`;

  try {
    const uploadResult = await uploadToCloudinary.uploader.upload(dataURI, {
      folder: "docbot_ai",
    });

    console.log("File uploaded to Cloudinary:", uploadResult);
    return uploadResult.secure_url;
  } catch (error) {
    console.log("Error uploading to Cloudinary:", error);
    return null;
  }
}
