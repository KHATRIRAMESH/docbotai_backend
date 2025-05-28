import express from "express";
import { fileSentToAdmin } from "../controller/fileSentToAdmin.controller.js";
import { localStore } from "../middlewares/multer.js";
import { filesUpload } from "../controller/filesUpload.controller.js";

const router = express.Router();
console.log("Files route initialized");

router.post("/", localStore.any(), fileSentToAdmin);
//api/admin-verify/upload
router.post("/upload", localStore.any(), filesUpload);

export default router;
