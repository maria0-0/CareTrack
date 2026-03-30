const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, async (req, res) => {
    const { imageUrl } = req.body; // URL-ul de pe S3

    if (!imageUrl) return res.status(400).json({ success: false, message: "URL lipsă." });

    try {
        // 1. Trimitem cererea către Azure Read API
        const response = await axios.post(
            `${process.env.AZURE_OCR_ENDPOINT}/vision/v3.2/read/analyze?language=ro`,
            { url: imageUrl },
            {
                headers: {
                    'Ocp-Apim-Subscription-Key': process.env.AZURE_OCR_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        // 2. Azure Read API este asincron. Primim un URL de unde luăm rezultatul.
        const operationLocation = response.headers['operation-location'];

        // 3. Verificăm periodic dacă procesarea e gata (Polling)
        let result;
        while (true) {
            result = await axios.get(operationLocation, {
                headers: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_OCR_KEY }
            });

            if (result.data.status === 'succeeded' || result.data.status === 'failed') break;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Așteptăm 1 secundă
        }

        if (result.data.status === 'failed') {
            return res.status(500).json({ success: false, message: "Azure OCR a eșuat." });
        }

        // 4. Extragem textul din liniile identificate de Azure
        let extractedText = "";
        result.data.analyzeResult.readResults.forEach(page => {
            page.lines.forEach(line => {
                extractedText += line.text + " ";
            });
            extractedText += "\n\n"; // Separăm paginile
        });

        res.json({ success: true, extractedText });

    } catch (err) {
        console.error("Azure OCR Error:", err.response?.data || err.message);
        res.status(500).json({ success: false, message: "Eroare la comunicarea cu Azure." });
    }
});

module.exports = router;