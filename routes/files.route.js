import express from "express";
import { fileSentToAdmin } from "../controller/fileSentToAdmin.controller.js";
import { localStore } from "../middlewares/multer.js";

const router = express.Router();
console.log("Files route initialized");

router.post("/", localStore.any(), fileSentToAdmin);


export default router;
