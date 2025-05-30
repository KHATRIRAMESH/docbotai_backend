import { promises as fs } from "fs";
import { pdf } from "pdf-to-img";
import path from "path";

export const convertPdfToImages = async (pdfPath, outputPath) => {
//   console.log("Converting PDF to images...");

  fs.mkdir(outputPath, { recursive: true });
  let counter = 1;
  const imagesPath = [];
  try {
    const document = await pdf(pdfPath, { scale: 3 });
    for await (const image of document) {
      const imagePath = path.join(outputPath, `page${counter}.png`);
      await fs.writeFile(imagePath, image);
      imagesPath.push(imagePath);
    //   console.log(`Page ${counter} converted to image: ${imagePath}`);
      counter++;
    }
  } catch (error) {
    console.error("Error converting PDF to images:", error);
    throw error;
  }
  return imagesPath;
};
