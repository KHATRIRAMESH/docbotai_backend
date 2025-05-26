import express from "express";
import { uploadDocument } from "../controller/files.controller.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();
console.log("Files route initialized");

router.post("/", upload.any(), uploadDocument);

export default router;
