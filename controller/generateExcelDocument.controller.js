//generating excel document from the files uploaded by the user using google vision api and openai api

export const generateExcelDocument = async (req, res) => {
  try {
    const { userId, loanType, fullName, permanentAddress, currentAddress } =
      req.body;
    const filePaths = req.files.map((file) => file.path);

    if (!filePaths || filePaths.length === 0) {
      return res.status(400).json({
        error: "No files to process",
        message: "filePaths array is required",
      });
    }

    // Here you would implement the logic to process the files and generate an Excel document
    // For example, using Google Vision API to extract text and OpenAI API to generate content

    // Placeholder for the generated Excel document URL
    const excelDocumentUrl =
      "http://example.com/path/to/generated/excel/document.xlsx";

    return res.status(200).json({
      message: "Excel document generated successfully",
      excelDocumentUrl,
    });
  } catch (error) {
    console.error("Error generating Excel document:", error);
    return res.status(500).json({
      error: "Failed to generate Excel document",
      message: error.message,
    });
  }
};
