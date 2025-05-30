//generating excel document from the files uploaded by the user using google vision api and openai api
import { User } from "../../sampleData/sampleData.js";
import excelJS from "exceljs";
import fs from "fs";
import path from "path";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateExcelDocument = async () => {
  try {
    const excelPath = path.join(__dirname, "../temp/excel");
    fs.mkdirSync(excelPath, { recursive: true });
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Document Data");

    worksheet.columns = [
      { header: "S no.", key: "s_no", width: 10 },
      { header: "First Name", key: "fname", width: 10 },
      { header: "Last Name", key: "lname", width: 10 },
      { header: "Email Id", key: "email", width: 10 },
      { header: "Gender", key: "gender", width: 10 },
    ];

    let counter = 1;
    User.forEach((user) => {
      user.s_no = counter;
      worksheet.addRow(user);
      counter++;
    });

    
    return await workbook.xlsx.writeFile(`${excelPath}/excelDocument.xlsx`);
  } catch (error) {
    console.error("Error generating Excel document:", error);
    return;
  }
};
