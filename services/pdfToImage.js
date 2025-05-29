import { promises as fs } from "fs";
import { pdf } from "pdf-to-img";
import path from "path";

export const convertPdfToImages = async (pdfPath, outputPath) => {
  console.log("Converting PDF to images...");

  fs.mkdir(outputPath, { recursive: true });
  let counter = 1;
  try {
    const document = await pdf(pdfPath, { scale: 3 });
    for await (const image of document) {
      const imagePath = path.join(outputPath, `page${counter}.png`);
      await fs.writeFile(imagePath, image);
      counter++;
    }
  } catch (error) {
    console.error("Error converting PDF to images:", error);
    throw error;
  }
  return `Converted ${counter - 1} pages to images in ${outputPath}`;
};
