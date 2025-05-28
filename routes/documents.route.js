import express from "express";
import { generateExcelDocument } from "../controller/generateExcelDocument.controller";

const router = express.Router();

router.get("/", generateExcelDocument);

export default router;
