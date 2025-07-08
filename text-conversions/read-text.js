const fs = require('fs');
const path = require('path');

/**
 * Extracts text from a file in Google Drive
 * @param {Object} drive - The Google Drive API Client
 * @param {string} fileId - The ID of the file to get text from
 * @returns {Promise<string>} - The extracted text from the file
 */
async function extractText(drive, fileId) {
    try {
        // get file metadata
        const fileMetaData = await drive.files.get({
            fileId: fileId,
            fields: 'name, size, mimeType'
        });

        const fileName = fileMetaData.data.name;
        const mimeType = fileMetaData.data.mimeType; 
        // const fileSizeMB = (fileMetaData.data.size / 1024 / 1024).toFixed(2);

        switch (mimeType) {
            case 'application/pdf':
                return await extractPDFText(drive, fileId, fileName);
            case 'application/vnd.google-apps.document':
                return await extractDocumentText(drive, fileId, fileName);
            case 'application/vnd.google-apps.spreadsheet':
                return await extractSpreadsheetText(drive, fileId, fileName);
            case 'application/vnd.google-apps.presentation':
                return await extractPresentationText(drive, fileId, fileName);
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return await extractWordDoc(drive, fileId, fileName);
            case 'text/plain':
                return await extractPlainText(drive, fileId, fileName);
                
            default:
                throw new Error(`Unsupported file type: ${mimeType}`);
        }
    } catch (error) {
        console.error(`Error extracting text from file: ${error.message}`);
    }
}

/**
 * Extracts text from a PDF file
 * @param {Object} drive - The Google Drive API Client
 * @param {string} fileId - The ID of the file to get text from
 * @param {string} fileName - The name of the file
 * @returns {Promise<string>} - The extracted text from the file
 */
async function extractPDFText(drive, fileId, fileName) {
    console.log(`Extracting text from file ${fileName}...`);
    const textResponse = await drive.files.get({
        fileId: fileId,
        alt: 'media'
    }, {
        responseType: 'arraybuffer'
    });

    const pdfParse = require('pdf-parse');
    
    // Handle Blob or ArrayBuffer response
    const pdfBuffer = await handleArrayBuffer(textResponse);
    const pdfData = await pdfParse(pdfBuffer);

    saveFile(pdfData.text, fileName, './saved-outputs/pdf');
    return pdfData.text; 
}

/**
 * Extracts text from a Google Doc file
 * @param {Object} drive - The Google Drive API Client
 * @param {string} fileId - The ID of the file to get text from
 * @param {string} fileName - The name of the file
 * @returns {Promise<string>} - The extracted text from the file
 */
async function extractDocumentText(drive, fileId, fileName) {
    console.log(`Extracting text from file ${fileName}...`);
    const textResponse = await drive.files.export({
        fileId: fileId,
        mimeType: 'text/plain'
    });

    console.log(`<<< Extracted ${textResponse.data.length} characters from Google Doc >>>`);
    saveFile(textResponse.data, fileName, './saved-outputs/document');
    return textResponse.data;
}

/**
 * Extracts text from a Google Sheet file
 * @param {Object} drive - The Google Drive API Client
 * @param {string} fileId - The ID of the file to get text from
 * @param {string} fileName - The name of the file
 * @returns {Promise<string>} - The extracted text from the file
 */
async function extractSpreadsheetText(drive, fileId, fileName) {
    console.log(`Extracting text from file ${fileName}...`);
    const textResponse = await drive.files.export({
        fileId: fileId,
        mimeType: 'text/csv'
    });

    const csvText = textResponse.data;
    const lines = csvText.split('\n');
    const formattedText = lines.filter(line => line.trim()).map(line => line.replace(/,/g, ' | ')).join('\n');

    saveFile(formattedText, fileName, './saved-outputs/spreadsheet');
    return formattedText;
}

/**
 * Extracts text from a Google Presentation file
 * @param {Object} drive - The Google Drive API Client
 * @param {string} fileId - The ID of the file to get text from
 * @param {string} fileName - The name of the file
 * @returns {Promise<string>} - The extracted text from the file
 */
async function extractPresentationText(drive, fileId, fileName) {
    console.log(`Extracting text from file ${fileName}...`);
    const textResponse = await drive.files.export({
        fileId: fileId,
        mimeType: 'text/plain'
    });

    saveFile(textResponse.data, fileName, './saved-outputs/presentation');
    return textResponse.data;
}

/**
 * Extracts text from a Word Doc file
 * @param {Object} drive - The Google Drive API Client
 * @param {string} fileId - The ID of the file to get text from
 * @param {string} fileName - The name of the file
 * @returns {Promise<string>} - The extracted text from the file
 */
async function extractWordDoc(drive, fileId, fileName) {
    console.log(`Extracting text from file ${fileName}...`);
    const textResponse = await drive.files.export({
        fileId: fileId,
        alt: 'media'
    }, { responseType: 'arraybuffer' });

    const buffer = await handleArrayBuffer(textResponse);

    const mammoth = require('mammoth');
    const result = await mammoth.convertToText(buffer);

    saveFile(result.value, fileName, './saved-outputs/word-doc');
    return result.value;
}

/**
 * Extracts text from a Plain Text file
 * @param {Object} drive - The Google Drive API Client
 * @param {string} fileId - The ID of the file to get text from
 * @param {string} fileName - The name of the file
 * @returns {Promise<string>} - The extracted text from the file
 */
async function extractPlainText(drive, fileId, fileName) {
    console.log(`Extracting text from file ${fileName}...`);
    const textResponse = await drive.files.get({
        fileId: fileId,
        alt: 'media'
    }, { responseType: 'text' });

    saveFile(textResponse.data, fileName, './saved-outputs/plain-text');
    return textResponse.data;
}

/**
 * Handles the response from the Google Drive API
 * @param {Object} response - The response from the Google Drive API
 * @returns {Promise<Buffer>} - The buffer of the response
 */
async function handleArrayBuffer(response) {
    if (response.data instanceof ArrayBuffer) {
        return Buffer.from(response.data);
    } else if (response.data.arrayBuffer) {
        return Buffer.from(await response.data.arrayBuffer());
    } else {
        return Buffer.from(response.data);
    }
}

/**
 * Saves the extracted text to a file
 * @param {string} text - The text to save
 * @param {string} originalFileName - The name of the original file
 * @param {string} outputDir - The directory to save the file to
 */
function saveFile(text, originalFileName, outputDir='./saved-outputs') {
    try {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log('<<< Created output directory >>>');
        }

        const baseName = path.parse(originalFileName).name;
        const outputFileName = `${baseName}-converted.txt`;
        const outputPath = path.join(outputDir, outputFileName);

        fs.writeFileSync(outputPath, text);
        console.log(`✅ Saved to ${outputPath}`);
    } catch (error) {
        console.error(`❌ Error saving file: ${error.message}`);
    }
}

module.exports = {
    extractText
}