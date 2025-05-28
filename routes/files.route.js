import express from "express";
import { fileSentToAdmin } from "../controller/fileSentToAdmin.controller.js";
import { localStore } from "../middlewares/multer.js";
import { verifyAndUploadDocuments } from "../controller/filesUpload.controller.js";

const router = express.Router();

router.post("/", localStore.any(), fileSentToAdmin);
//api/admin-verify/upload
router.post("/upload", localStore.any(), verifyAndUploadDocuments);

export default router;
