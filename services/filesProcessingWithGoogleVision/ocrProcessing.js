import { createWorker, createScheduler } from 'tesseract.js';
import * as fs from 'fs'; // Using * as fs for consistent import of fs.existsSync, fs.readFileSync etc.
import * as path from 'path';
import sharp from 'sharp';
import { enhanceWithOpenAIVision, extractStructuredData, isValidApiKey } from './openaiVision.js'; // Ensure .js extension
import { extractTextFromPdf as pdfTextExtract } from './pdfTextExtractor.js'; // Ensure .js extension
import { exec } from 'child_process';
import {
  extractTextFromImage as googleVisionExtractImage,
  extractTextFromPdf as googleVisionExtractPdf,
  isVisionAvailable
} from './googleVision.js'; // Ensure .js extension

// OCR module for document text extraction
// Leverages both Tesseract.js for local OCR and OpenAI Vision for enhanced capabilities

// Initialize Tesseract worker and scheduler
let worker = null;
let scheduler = null;
let ocrSchedulerInitialized = false;

/**
 * Initialize the OCR worker if not already initialized
 */
async function ensureOcrWorkerInitialized() {
  if (!worker) {
    try {
      worker = await createWorker('eng');
      console.log('Tesseract OCR worker initialized successfully');
    } catch (err) {
      console.error('Failed to initialize Tesseract OCR worker:', err);
      worker = null;
    }
  }
  return worker;
}

/**
 * Ensures OCR scheduler is initialized with workers
 */
async function ensureOcrSchedulerInitialized() {
  if (!ocrSchedulerInitialized) {
    try {
      if (!scheduler) {
        scheduler = createScheduler();
        console.log('Created Tesseract scheduler');
      }

      // Add worker to scheduler if we have one
      if (worker) {
        scheduler.addWorker(worker);
      } else {
        // Initialize a worker and add to scheduler
        const newWorker = await createWorker('eng');
        scheduler.addWorker(newWorker);

        // If we didn't have a worker already, store this one
        if (!worker) {
          worker = newWorker;
        }
      }

      // Try to add additional workers for better performance
      try {
        for (let i = 0; i < 2; i++) {
          const additionalWorker = await createWorker('eng');
          scheduler.addWorker(additionalWorker);
          console.log(`Added additional Tesseract worker #${i+1}`);
        }
      } catch (additionalWorkerError) {
        console.warn('Could not create additional workers:', additionalWorkerError);
      }

      ocrSchedulerInitialized = true;
      console.log('OCR scheduler initialized with workers');
    } catch (err) {
      console.error('Failed to initialize OCR scheduler:', err);
      return false;
    }
  }
  return ocrSchedulerInitialized;
}

/**
 * Extract text from an image using OCR, with fallback to OpenAI Vision
 * @param {string} imagePath Path to the image file
 */
export async function extractTextFromImage(imagePath) {
  try {
    // First check if Google Vision is available and use it as the preferred method
    if (isVisionAvailable()) {
      try {
        console.log('Using Google Vision API for image extraction');
        const text = await googleVisionExtractImage(imagePath);
        if (text && text.trim().length > 50) {
          console.log(`Google Vision API extracted ${text.length} characters`);
          return text;
        } else {
          console.log('Google Vision returned minimal text, trying other methods');
        }
      } catch (visionError) {
        console.warn('Google Vision API failed:', visionError);
      }
    }

    // Process the image for better OCR results with our backup methods
    const processedImagePath = await processImage(
      imagePath,
      imagePath + '_processed.jpg'
    );

    // Second approach: Try using native PDF text extraction if it's a PDF
    // (This is just a safety check in case a PDF is incorrectly detected as an image)
    if (path.extname(imagePath).toLowerCase() === '.pdf') {
      try {
        console.log(`Image path appears to be a PDF, trying native extraction first: ${imagePath}`);

        // Use a Promise to handle the exec callback
        const pdfText = await new Promise((resolve, reject) => {
          // Use pdftotext utility if available (via exec)
          exec(`pdftotext "${imagePath}" -`, (error, stdout, stderr) => {
            if (error) {
              console.warn(`pdftotext execution error: ${error.message}`);
              reject(error);
              return;
            }
            if (stderr) {
              console.warn(`pdftotext stderr: ${stderr}`);
            }
            resolve(stdout);
          });
        });

        if (pdfText && pdfText.trim().length > 100) {
          console.log(`Native PDF extraction produced ${pdfText.length} characters`);

          // Clean up processed image
          if (fs.existsSync(processedImagePath)) {
            fs.unlinkSync(processedImagePath);
          }

          return pdfText;
        }
      } catch (pdfError) {
        console.log('Native PDF extraction failed or not available, continuing with image processing');
      }
    }

    // Third approach: Try Tesseract OCR (local processing)
    try {
      console.log(`Extracting image text with Tesseract OCR: ${processedImagePath}`);

      // Check if we can use the scheduler (more efficient)
      if (await ensureOcrSchedulerInitialized() && scheduler) {
        try {
          // Use scheduler with multiple workers for better performance
          const { data: { text } } = await scheduler.addJob('recognize', processedImagePath);

          // If we got substantial text, return it
          if (text && text.trim().length > 50) {
            console.log(`Tesseract OCR scheduler extracted ${text.length} characters`);

            // Clean up processed image
            if (fs.existsSync(processedImagePath)) {
              fs.unlinkSync(processedImagePath);
            }

            return text;
          } else {
            console.log('Tesseract returned minimal text, trying other methods');
          }
        } catch (schedulerError) {
          console.warn('Tesseract scheduler failed:', schedulerError);
        }
      } else {
        // Fall back to single worker if scheduler initialization failed
        const worker = await ensureOcrWorkerInitialized();

        if (worker) {
          // If Tesseract worker initialized properly, use it
          try {
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            const { data: { text } } = await worker.recognize(processedImagePath);

            // If we got substantial text, return it
            if (text && text.trim().length > 50) {
              console.log(`Tesseract OCR worker extracted ${text.length} characters`);

              // Clean up processed image
              if (fs.existsSync(processedImagePath)) {
                fs.unlinkSync(processedImagePath);
              }

              return text;
            } else {
              console.log('Tesseract returned minimal text, trying other methods');
            }
          } catch (tesseractError) {
            console.error('Tesseract OCR failed:', tesseractError);
          }
        }
      }

      // If Tesseract returned minimal or no text, try OpenAI Vision
      console.log('Tesseract OCR produced insufficient text, trying OpenAI Vision API');
    } catch (ocrError) {
      console.warn('Tesseract OCR processing failed:', ocrError);
    }

    // Fourth approach: Try OpenAI Vision API (better quality but requires API key)
    try {
      console.log(`Extracting image text with OpenAI Vision: ${imagePath}`);
      const { extractedText } = await enhanceWithOpenAIVision(imagePath);

      // Clean up processed image
      if (fs.existsSync(processedImagePath)) {
        fs.unlinkSync(processedImagePath);
      }

      return extractedText;
    } catch (visionError) {
      console.warn('OpenAI Vision failed:', visionError);

      // If all OCR methods fail, return basic information
      const stats = fs.statSync(imagePath);
      return `Image processed (${stats.size} bytes). OCR processing failed - please try again or process manually.`;
    }
  } catch (error) {
    console.error('Error extracting text from image:', error);
    return '';
  }
}

/**
 * Extract text from a PDF document
 * @param {string} pdfPath Path to the PDF file
 */
export async function extractTextFromPdf(pdfPath) {
  try {
    // First check if Google Vision is available and use it as the preferred method
    if (isVisionAvailable()) {
      try {
        console.log('Using Google Vision API for PDF extraction');
        const text = await googleVisionExtractPdf(pdfPath);
        if (text && text.trim().length > 100) {
          console.log(`Google Vision API extracted ${text.length} characters from PDF`);
          return text;
        } else {
          console.log('Google Vision returned minimal text, trying other methods');
        }
      } catch (visionError) {
        console.warn('Google Vision API failed for PDF:', visionError);
      }
    }

    // Use our dedicated PDF text extractor that handles multiple extraction methods
    const extractedText = await pdfTextExtract(pdfPath);

    // If we got substantial text, return it
    if (extractedText && extractedText.trim().length > 100) {
      return extractedText;
    }

    // If the specialized extractor didn't work well, fall back to our existing code
    console.log('Using legacy PDF extraction as fallback');

    // Second approach: Use OpenAI Vision for better results with scanned PDFs
    try {
      // Use OpenAI Vision API to get better text extraction
      const { extractedText } = await enhanceWithOpenAIVision(pdfPath);
      if (extractedText && extractedText.trim().length > 10) {
        console.log(`OpenAI Vision extracted ${extractedText.length} characters from PDF`);
        return extractedText;
      } else {
        console.log('OpenAI Vision returned empty or very short text, trying alternative approach');
      }
    } catch (visionError) {
      console.warn('OpenAI Vision PDF extraction failed, trying alternative approach:', visionError);
    }

    // Third approach: Process PDF page by page using image conversion and Tesseract
    try {
      // Create a temporary directory for extracted pages
      const tempDir = path.join(process.cwd(), 'temp', 'pdf-extract-' + Date.now());
      fs.mkdirSync(tempDir, { recursive: true });

      console.log(`Processing PDF by converting to images for OCR: ${pdfPath}`);

      // Use Sharp to convert PDF pages to images
      const fileBuffer = fs.readFileSync(pdfPath);
      const basename = path.basename(pdfPath, path.extname(pdfPath));

      // Try to extract pages using Sharp
      const outputPagePaths = [];
      try {
        // Convert first few pages to images
        for (let pageIndex = 0; pageIndex < 5; pageIndex++) {
          try {
            const outputImagePath = path.join(tempDir, `${basename}-page-${pageIndex+1}.png`);
            await sharp(fileBuffer, { page: pageIndex })
              .toFile(outputImagePath);
            outputPagePaths.push(outputImagePath);
          } catch (pageError) {
            // Stop if we've reached the end of the document
            if (pageError instanceof Error && pageError.message.includes('out of range')) {
              break;
            }
            console.warn(`Error converting page ${pageIndex+1}:`, pageError instanceof Error ? pageError.message : String(pageError));
          }
        }
      } catch (sharpError) {
        console.warn('Sharp PDF conversion failed:', sharpError);
      }

      // If we extracted any pages, use Tesseract to process them
      if (outputPagePaths.length > 0) {
        // Process each page with Tesseract
        const extractedTexts = [];

        // Try to use the scheduler for better performance
        if (await ensureOcrSchedulerInitialized() && scheduler) {
          try {
            console.log('Using Tesseract scheduler for PDF page processing');
            // Process all pages in parallel using the scheduler
            const recognitionJobs = outputPagePaths.map(pagePath =>
              scheduler.addJob('recognize', pagePath)
            );

            // Wait for all jobs to complete
            const results = await Promise.all(recognitionJobs);

            // Collect the results
            for (let i = 0; i < results.length; i++) {
              const { data: { text } } = results[i];
              if (text && text.trim().length > 0) {
                extractedTexts.push(text);
                console.log(`Page ${i+1} OCR extracted ${text.length} characters`);
              }
            }
          } catch (schedulerError) {
            console.warn('Scheduler-based page processing failed:', schedulerError);
            // Fall back to sequential processing
          }
        }

        // If scheduler failed or no results, fall back to sequential processing
        if (extractedTexts.length === 0) {
          console.log('Falling back to sequential page processing');
          for (const pagePath of outputPagePaths) {
            try {
              // Initialize Tesseract worker if needed
              await ensureOcrWorkerInitialized();

              if (worker) {
                const { data: { text } } = await worker.recognize(pagePath);
                if (text.trim().length > 0) {
                  extractedTexts.push(text);
                }
              }
            } catch (tesseractError) {
              console.warn(`Tesseract OCR failed for page ${pagePath}:`, tesseractError);
            }
          }
        }

        // Clean up the page images
        for (const pagePath of outputPagePaths) {
          try {
            if (fs.existsSync(pagePath)) {
              fs.unlinkSync(pagePath);
            }
          } catch (e) {
            // Ignore cleanup errors
          }
        }

        // Clean up the temporary directory
        try {
          fs.rmdirSync(tempDir, { recursive: true });
        } catch (e) {
          // Ignore cleanup errors
        }

        // If we got any text, return it
        if (extractedTexts.length > 0) {
          const combinedText = extractedTexts.join('\n\n');
          console.log(`Image-based OCR extracted ${combinedText.length} characters from PDF`);
          return combinedText;
        }
      }

      // If we couldn't extract any pages or no text was found, try a last approach
      console.warn('Page-by-page processing failed, trying one more approach');

      // Try an alternative approach with OpenAI Vision on the first page
      try {
        // Use a different OpenAI Vision prompt focused on PDF text
        const visionResult = await enhanceWithOpenAIVision(pdfPath, 'first_page');

        if (visionResult.extractedText && visionResult.extractedText.trim().length > 10) {
          console.log(`Alternative Vision approach extracted ${visionResult.extractedText.length} characters`);
          return visionResult.extractedText;
        }
      } catch (altVisionError) {
        const errorMessage = altVisionError instanceof Error ? altVisionError.message : String(altVisionError);
        console.warn('Alternative Vision approach failed:', errorMessage);
      }
    } catch (processingError) {
      console.error('PDF processing error:', processingError);
    }

    // If all extraction methods fail, return basic information
    const fileName = path.basename(pdfPath);
    const fileStats = fs.statSync(pdfPath);
    const fileSize = Math.round(fileStats.size / 1024) + ' KB';
    const fileDate = new Date(fileStats.mtime).toLocaleString();

    return `PDF document: ${fileName}\nSize: ${fileSize}\nDate: ${fileDate}\n\nText extraction failed. Please try again with a different PDF format or use manual data entry.`;

  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return `Error processing PDF: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Extract all information from a document file
 * @param {string} filePath Path to the document file
 * @param {string} fileType Type of document (pdf, image, excel, etc.)
 */
export async function extractAllInformation(filePath, fileType) {
  // Initialize result structure
  let extractedText = '';
  let structuredData = {};

  try {
    // Improved file type detection with better logging
    // Get file extension from path
    const fileExtension = path.extname(filePath).toLowerCase();

    // Check if file exists first
    if (!fs.existsSync(filePath)) {
      console.error(`[EXTRACTION] File does not exist: ${filePath}`);
      return {
        extractedText: `Error: File not found at ${filePath}`,
        structuredData: { error: 'File not found' }
      };
    }

    // Get file stats for debugging
    const fileStats = fs.statSync(filePath);
    const fileSizeKB = Math.round(fileStats.size / 1024);

    // Normalize and check file type string - ensure it's a valid string
    const normalizedFileType = (fileType || '').toLowerCase();

    // Determine the actual file type using both the extension and the provided MIME type
    const isPdf = normalizedFileType.includes('pdf') || fileExtension === '.pdf';
    const isImage = normalizedFileType.includes('image') ||
                    ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'].includes(fileExtension);
    const isExcel = normalizedFileType.includes('excel') ||
                    normalizedFileType.includes('spreadsheet') ||
                    ['.xlsx', '.xls', '.csv'].includes(fileExtension);

    // Enhanced diagnostic logging
    console.log(`[EXTRACTION] Processing file: ${path.basename(filePath)}`);
    console.log(`[EXTRACTION] File details: size=${fileSizeKB}KB, extension=${fileExtension}, MIME=${fileType}`);
    console.log(`[EXTRACTION] Detected as: ${isPdf ? 'PDF' : isImage ? 'Image' : isExcel ? 'Excel' : 'Other'}`);

    // DIRECT IMAGE EXTRACTION - Prioritize OpenAI Vision for images since it's most reliable
    if (isImage && isValidApiKey()) {
      console.log(`[EXTRACTION] Prioritizing OpenAI Vision API for image processing`);
      try {
        const { extractedText: visionText, structuredData: visionData } = await enhanceWithOpenAIVision(filePath);

        if (visionText && visionText.trim().length > 50) {
          console.log(`[EXTRACTION] OpenAI Vision API successfully extracted ${visionText.length} characters`);
          return {
            extractedText: visionText,
            structuredData: visionData
          };
        } else {
          console.log(`[EXTRACTION] OpenAI Vision returned minimal text (${visionText?.length || 0} chars), trying other methods`);
        }
      } catch (visionError) {
        console.warn(`[EXTRACTION] OpenAI Vision extraction failed:`, visionError);
        // Continue to other methods
      }
    }

    // Use appropriate extraction method based on detected file type
    if (isPdf) {
      // PDF extraction
      console.log(`[EXTRACTION] Extracting text from PDF file: ${path.basename(filePath)}`);
      extractedText = await extractTextFromPdf(filePath);
    } else if (isImage) {
      // Image extraction with improved error handling and fallbacks
      console.log(`[EXTRACTION] Extracting text from image file: ${path.basename(filePath)}`);

      // First try Google Vision if available
      const canUseGoogleVision = isVisionAvailable();
      if (canUseGoogleVision) {
        try {
          console.log('[EXTRACTION] Using Google Vision API for image extraction');
          const visionText = await googleVisionExtractImage(filePath);
          if (visionText && visionText.trim().length > 50) {
            console.log(`[EXTRACTION] Google Vision API extracted ${visionText.length} characters`);
            extractedText = visionText;
          } else {
            console.log('[EXTRACTION] Google Vision returned minimal text, trying Tesseract');
          }
        } catch (visionError) {
          console.warn('[EXTRACTION] Google Vision API error:', visionError);
        }
      }

      // If Google Vision failed or returned minimal text, try Tesseract OCR
      if (!extractedText || extractedText.trim().length < 50) {
        try {
          console.log('[EXTRACTION] Trying Tesseract OCR for image extraction');
          extractedText = await extractTextFromImage(filePath);
          console.log(`[EXTRACTION] Tesseract extracted ${extractedText.length} characters`);
        } catch (tesseractError) {
          console.error(`[EXTRACTION] Tesseract OCR failed:`, tesseractError);
          extractedText = `Error extracting text from image. Please try a clearer image.`;
        }
      }

      // If OpenAI API is available but wasn't tried yet, and other methods failed
      if ((!extractedText || extractedText.trim().length < 50) && isValidApiKey()) {
        try {
          console.log('[EXTRACTION] Trying OpenAI Vision as final fallback');
          const { extractedText: visionText } = await enhanceWithOpenAIVision(filePath);
          if (visionText && visionText.trim().length > 0) {
            extractedText = visionText;
          }
        } catch (finalError) {
          console.error('[EXTRACTION] All extraction methods failed');
          if (!extractedText) {
            extractedText = `Could not extract text from image. The file may be corrupt or contain no readable text.`;
          }
        }
      }
    } else if (isExcel) {
      // For Excel files, we handle them differently (in a different module)
      console.log(`[EXTRACTION] Excel file detected: ${path.basename(filePath)}`);
      extractedText = `Excel file detected: ${path.basename(filePath)}. Structured data will be extracted separately.`;
    } else {
      // For other file types, just return basic information
      console.log(`[EXTRACTION] Unsupported file type: ${path.basename(filePath)}`);
      extractedText = `File: ${path.basename(filePath)} (${fileType})
Type: ${fileExtension.replace('.', '').toUpperCase() || 'Unknown'}
Size: ${fileSizeKB} KB
Date: ${new Date(fileStats.mtime).toLocaleString()}

Text extraction not supported for this file type.`;
    }

    // Always ensure we have some extracted text
    if (!extractedText || extractedText.trim().length === 0) {
      extractedText = `The system could not extract any text from this file. It may be an image without text content or in an unsupported format.`;
    }

    // After extracting text, try to also extract structured data using AI
    console.log(`[EXTRACTION] Extracting structured data from text (${extractedText.length} chars)`);
    try {
      structuredData = await extractStructuredData(extractedText);
      console.log(`[EXTRACTION] Successfully extracted ${Object.keys(structuredData).length} structured fields`);

      // Always ensure raw_extracted_text is populated
      if (!structuredData.raw_extracted_text || structuredData.raw_extracted_text.trim() === '') {
        structuredData.raw_extracted_text = extractedText;
      }
    } catch (structureError) {
      console.warn('[EXTRACTION] Failed to extract structured data:', structureError);
      structuredData = {
        error: 'Failed to extract structured data',
        raw_extracted_text: extractedText
      };
    }

    return {
      extractedText,
      structuredData
    };
  } catch (error) {
    console.error('[EXTRACTION] Critical error in extractAllInformation:', error);
    return {
      extractedText: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      structuredData: {
        error: 'Processing failed',
        raw_extracted_text: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    };
  }
}

/**
 * Process an image file (resize, optimize)
 * @param {string} filePath Path to the image file
 * @param {string} outputPath Path to save the processed image
 */
export async function processImage(filePath, outputPath) {
  try {
    // Skip processing if the file is not an image
    const extension = path.extname(filePath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif'].includes(extension)) {
      return filePath; // Return original path if not an image
    }

    // Create directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Load the image metadata to determine appropriate processing
    const metadata = await sharp(filePath).metadata();
    console.log(`Processing image: ${path.basename(filePath)}, Size: ${metadata.width}x${metadata.height}, Format: ${metadata.format}`);

    // Base processing pipeline
    let imageProcessor = sharp(filePath);

    // Check if image has alpha channel that might interfere with OCR
    if (metadata.hasAlpha) {
      console.log(`Image has alpha channel, flattening to white background`);
      // Flatten transparent background to white for better OCR
      imageProcessor = imageProcessor.flatten({ background: { r: 255, g: 255, b: 255 } });
    }

    // Advanced adaptive processing based on image characteristics
    if (metadata.width && metadata.height) {
      const aspectRatio = metadata.width / metadata.height;
      const totalPixels = metadata.width * metadata.height;

      // If image is very large, apply stronger resize for performance
      let targetWidth = 2500;
      let targetHeight = 2500;

      if (totalPixels > 10000000) { // More than 10 megapixels
        console.log(`Large image detected (${totalPixels} pixels), applying optimized processing`);

        // For very large images, we need more aggressive noise reduction
        imageProcessor = imageProcessor.median(1);
      } else if (totalPixels < 100000) { // Small image (less than 0.1 megapixels)
        console.log(`Small image detected (${totalPixels} pixels), applying enhancement processing`);

        // For small images, preserve more detail and upscale slightly if needed
        targetWidth = Math.max(1200, metadata.width);
        targetHeight = Math.max(1200, metadata.height);

        // Enhance edges for small images to improve text recognition
        imageProcessor = imageProcessor.sharpen({
          sigma: 1.2,
          m1: 1.0,
          m2: 0.8,
          x1: 1.5,
          y2: 8,
          y3: 12
        });
      }

      // Adjust dimensions to maintain aspect ratio
      if (aspectRatio > 1) { // Landscape
        targetHeight = Math.round(targetWidth / aspectRatio);
      } else { // Portrait
        targetWidth = Math.round(targetHeight * aspectRatio);
      }

      // Apply the calculated dimensions
      imageProcessor = imageProcessor.resize({
        width: targetWidth,
        height: targetHeight,
        fit: 'inside',
        withoutEnlargement: metadata.width < 1000 || metadata.height < 1000
      });
    }

    // Apply standard processing enhancements
    imageProcessor = imageProcessor
      // Convert to grayscale for better OCR text detection
      .grayscale()
      // Improve contrast for better text/background separation
      .normalize()
      // Moderate sharpening for better text edges
      .sharpen({
        sigma: 1.6,
        m1: 0.5,
        m2: 0.7,
        x1: 2,
        y2: 10,
        y3: 20
      });

    // Save as high-quality JPEG with white background (best for OCR)
    await imageProcessor
      .jpeg({
        quality: 92,
        chromaSubsampling: '4:4:4', // Better quality for text
        force: true // Ensure JPEG output regardless of input format
      })
      .toFile(outputPath);

    console.log(`Enhanced image saved to ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error processing image:', error);
    return filePath; // Return original path on error
  }
}

/**
 * Clean up temporary files
 * @param {string[]} filePaths Array of file paths to delete
 */
export function cleanupFiles(filePaths) {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up temporary file: ${filePath}`);
      }
    } catch (error) {
      console.warn(`Failed to clean up file ${filePath}:`, error);
    }
  }
}

/**
 * Normalize raw extracted text data for better processing
 * @param {string} rawText Raw text extracted from a document
 * @returns {string} Normalized text with consistent spacing and formatting
 */
export function normalizeRawData(rawText) {
  if (!rawText) return '';

  return rawText
    // Replace multiple spaces with a single space
    .replace(/\s+/g, ' ')
    // Replace multiple newlines with a single newline
    .replace(/\n+/g, '\n')
    // Remove leading/trailing whitespace
    .trim();
}