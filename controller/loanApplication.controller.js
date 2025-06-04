import { db } from "../db/connection.js";
import { loanApplications } from "../db/schema.js";

//loan applications are created when user submits documents for loan. so no need to create here
export const getAllLoanApplications = async (req, res) => {
  try {
    const applications = await db
      .select({
        id: loanApplications.id,
        loanCode: loanApplications.loanCode,
        userId: loanApplications.userId,
        loanType: loanApplications.loanType,
        fullName: loanApplications.fullName,
        files: loanApplications.files,
        status: loanApplications.status,
        submittedAt: loanApplications.submittedAt,
        updatedAt: loanApplications.updatedAt,
      })
      .from(loanApplications);

    res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error("Error fetching loan applications:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch loan applications",
    });
  }
};

export const updateLoanApplicationStatus = async (req, res) => {
  try {
    const { applicationId, status } = req.body;

    // Validate required fields
    if (!applicationId || !status) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Update loan application status
    const updatedApplication = await db
      .update(loanApplications)
      .set({ status })
      .where(eq(loanApplications.id, applicationId));

    if (updatedApplication.count === 0) {
      return res.status(404).json({
        success: false,
        error: "Loan application not found",
      });
    }

    res.json({
      success: true,
      data: updatedApplication,
    });
  } catch (error) {
    console.error("Error updating loan application status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update loan application status",
    });
  }
};
