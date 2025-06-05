import express from "express";
import { getGeneratedExcelDocument } from "../controller/generatedExcelDocument.controller.js";

const router = express.Router();

router.get("/", getGeneratedExcelDocument);

export default router;
