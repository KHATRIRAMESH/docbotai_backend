import { promises as fs } from "fs";
import path from "path";

const uploadsDir = path.join(process.cwd(), "temp/pdf2Images");

export const getPngFilePaths = async () => {
  try {
    const files = await fs.readdir(uploadsDir);
    const pngFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === ".png"
    );
    console.log("Files in uploads directory:", pngFiles);

    const relativePaths = pngFiles.map((file) =>
      path.relative(process.cwd(), path.join(uploadsDir, file))
    );

    //   const= absolutePaths = pngFiles.map((file) =>
    console.log("Relative file paths:", relativePaths.sort());
    return relativePaths;
  } catch (error) {
    console.error("Failed to read uploads directory:", error);
    return [];
  }
};
