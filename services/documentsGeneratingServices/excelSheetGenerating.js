import excelJS from "exceljs";
import { promises as fs } from "fs";

const outputPath = "temp/excel";
export const generateExcelDocument = async (input, userName) => {
  const dataArray = Array.isArray(input) ? input : [input];
  // console.log("Generating Excel document with data: ", dataArray);
  await fs.mkdir(outputPath, { recursive: true });
  try {
    // const excelPath = path.join(__dirname, "../temp/excel");

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Document Data");

    // Check if dataArray is provided and not empty
    if (!dataArray || dataArray.length === 0) {
      throw new Error("No data provided to generate Excel document");
    }

    // Get the first object to determine the structure
    const firstObject = dataArray[0];
    // console.log("First object in dataArray:", firstObject);

    // Generate dynamic columns based on object keys
    const dynamicColumns = Object.keys(firstObject).map((key) => {
      return {
        header: formatHeader(key), // Convert snake_case to readable format
        key: key,
        width: calculateColumnWidth(key, firstObject[key]), // Dynamic width based on content
      };
    });

    worksheet.columns = dynamicColumns;

    // Add data rows
    dataArray.forEach((dataObject, index) => {
      // Add serial number if not present
      const rowData = { s_no: index + 1, ...dataObject };
      worksheet.addRow(rowData);
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    const time = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${outputPath}/${userName.replace(
      " ",
      ""
    )}-excelDocument.xlsx`;

    await workbook.xlsx.writeFile(fileName);
    // console.log(`Excel file generated successfully: ${fileName}`);
    return fileName;
  } catch (error) {
    console.error("Error generating Excel document:", error);
    throw error;
  }
};

// Helper function to format header names
const formatHeader = (key) => {
  return key
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
};

// Helper function to calculate appropriate column width
const calculateColumnWidth = (key, value) => {
  const headerLength = formatHeader(key).length;
  const valueLength = value ? value.toString().length : 0;
  const maxLength = Math.max(headerLength, valueLength);

  // Set minimum width of 10, maximum of 50
  return Math.min(Math.max(maxLength + 2, 10), 50);
};

// Usage example for your specific case:
export const generateExcelFromStructuredResult = async (structuredResult) => {
  try {
    // Convert single object to array format
    const dataArray = Array.isArray(structuredResult)
      ? structuredResult
      : [structuredResult];

    return await generateExcelDocument(dataArray);
  } catch (error) {
    console.error("Error processing structured result:", error);
    throw error;
  }
};
