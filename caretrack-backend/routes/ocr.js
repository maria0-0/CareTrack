const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const OcrService = require('../services/ocrService');

/**
 * Endpoint for extracting text from medical documents.
 * It uses the modular OcrService, which supports multiple providers:
 * - Azure (Full Cloud Vision)
 * - Tesseract (Local Free OCR)
 * - Mock (Development)
 */
router.post('/', authenticateToken, async (req, res) => {
    const { imageUrl } = req.body;

    if (!imageUrl) {
        return res.status(400).json({ success: false, message: "URL lipsă." });
    }

    try {
        // Unified call to the OCR service
        const extractedText = await OcrService.extractText(imageUrl);

        res.json({ success: true, extractedText });

    } catch (err) {
        console.error("OCR Route Error:", err.message);
        res.status(500).json({ success: false, message: "Eroare la extragerea textului din imagine." });
    }
});

module.exports = router;