const axios = require('axios');
const Tesseract = require('tesseract.js');

/**
 * OcrService implements the Provider Pattern for text extraction.
 * This allows the application to switch between high-quality cloud services (Azure)
 * and free, local alternatives (Tesseract.js) or testing mocks.
 */
class OcrService {
    /**
     * Extracts text from an image URL using the configured provider.
     * @param {string} imageUrl - The URL of the image to process.
     * @returns {Promise<string>} - The extracted text.
     */
    static async extractText(imageUrl) {
        const provider = (process.env.OCR_PROVIDER || 'tesseract').toLowerCase();

        console.log(`[OcrService] Using provider: ${provider}`);

        switch (provider) {
            case 'azure':
                return await this.azureOcr(imageUrl);
            case 'tesseract':
                return await this.tesseractOcr(imageUrl);
            case 'mock':
                return this.mockOcr(imageUrl);
            default:
                throw new Error(`OCR provider "${provider}" is not supported.`);
        }
    }

    /**
     * Provider: Azure Read API (Vision v3.2)
     * High accuracy, but requires a paid subscription key.
     */
    static async azureOcr(imageUrl) {
        const endpoint = process.env.AZURE_OCR_ENDPOINT;
        const key = process.env.AZURE_OCR_KEY;

        if (!endpoint || !key) {
            throw new Error("Azure OCR configuration missing (Endpoint/Key).");
        }

        try {
            // Initiate the read operation
            const response = await axios.post(
                `${endpoint}/vision/v3.2/read/analyze?language=ro`,
                { url: imageUrl },
                {
                    headers: {
                        'Ocp-Apim-Subscription-Key': key,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const operationLocation = response.headers['operation-location'];

            // Poll for results
            let result;
            while (true) {
                result = await axios.get(operationLocation, {
                    headers: { 'Ocp-Apim-Subscription-Key': key }
                });

                if (result.data.status === 'succeeded' || result.data.status === 'failed') break;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (result.data.status === 'failed') {
                throw new Error("Azure OCR processing failed.");
            }

            // Combine all lines into a single text block
            let extractedText = "";
            result.data.analyzeResult.readResults.forEach(page => {
                page.lines.forEach(line => {
                    extractedText += line.text + " ";
                });
                extractedText += "\n\n";
            });

            return extractedText.trim();

        } catch (err) {
            console.error("Azure OCR Provider Error:", err.response?.data || err.message);
            throw new Error("Failed to extract text using Azure Vision API.");
        }
    }

    /**
     * Provider: Tesseract.js (Local)
     * COMPLETELY FREE. Runs locally on the server.
     * Note: Pure JavaScript implementation, great for portability.
     */
    static async tesseractOcr(imageUrl) {
        try {
            console.log(`[OcrService] Starting Tesseract extraction for: ${imageUrl}`);
            
            // Tesseract.js worker initialization
            const { data: { text } } = await Tesseract.recognize(
                imageUrl,
                'ron+eng', // Romanian and English languages
                {
                    logger: m => console.log(`[Tesseract] ${m.status}: ${Math.round(m.progress * 100)}%`)
                }
            );

            return text || "No text could be extracted by Tesseract.";
        } catch (err) {
            console.error("Tesseract OCR Provider Error:", err.message);
            throw new Error("Failed to extract text using local Tesseract engine.");
        }
    }

    /**
     * Provider: Mock OCR (Development)
     * Returns a predefined text snippet. Useful for rapid testing.
     */
    static mockOcr(imageUrl) {
        return `[MOCK OCR RESULT for ${imageUrl}]\n\nNume Pacient: Maria Petrulescu\nDiagnostic: Control de rutină\nRecomandări: Hidratare corespunzătoare și exerciții fizice zilnice.`;
    }
}

module.exports = OcrService;
