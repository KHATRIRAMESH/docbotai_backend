import { promises as fs } from "fs";
import { pdf } from "pdf-to-img";

export const convertPdfToImages = async (pdfPath, outputDir) => {
  console.log("Converting PDF to images...");
  let counter = 1;
  try {
    const document = await pdf(pdfPath, { scale: 3 });
    for await (const image of document) {
      await fs.writeFile(`page${counter}.png`, image);
      counter++;
    }
  } catch (error) {
    console.error("Error converting PDF to images:", error);
    throw error;
  }
  return `Converted ${counter - 1} pages to images in ${outputDir}`;
};
