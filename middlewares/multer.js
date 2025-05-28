import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically create the folder if it doesn't exist
const uploadPath = path.join(__dirname, "../temp/uploads");
fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath); // Correct relative path to your folder
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Use full original name
  },
});

export const localStore = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});
