import { db } from "../db/connection.js";
import { generatedFiles } from "../db/schema.js";

export const getGeneratedExcelDocument = async (req, res) => {
  try {
    const allGeneratedFiles = await db
      .select({
        id: generatedFiles.id,
        excelSheetPath: generatedFiles.excelSheetPath,
      })
      .from(generatedFiles);

    res.json({
      success: true,
      data: allGeneratedFiles,
      count: allGeneratedFiles.length,
    });
  } catch (error) {
    console.log("Error fetching generated Excel document:", error);
  }
};
