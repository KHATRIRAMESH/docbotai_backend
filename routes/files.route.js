import express from "express";
import { uploadDocument } from "../controller/files.controller.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

router.post("/", upload.array("documents", 10), uploadDocument);

export default router;
