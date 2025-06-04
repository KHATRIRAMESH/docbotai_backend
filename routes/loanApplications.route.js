import express from "express";
import {
  getAllLoanApplications,
  updateLoanApplicationStatus,
} from "../controller/loanApplication.controller.js";

const router = express.Router();

router.get("/", getAllLoanApplications);

router.patch("/:id", updateLoanApplicationStatus);
//

export default router;
