import React, { useState } from 'react';
import API_URL from '../../apiConfig';

function OcrExtractor({ patient, user, onRefresh }) {
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResultText, setOcrResultText] = useState('');

  const handleOcrExtraction = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setOcrLoading(true);

    const formData = new FormData();
    formData.append('patientFile', file);
    formData.append('description', 'OCR Scan');

    try {
      const uploadRes = await fetch(`${API_URL}/patients/${patient.id}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body: formData
      });
      const uploadData = await uploadRes.json();

      if (uploadData.success) {
        const ocrRes = await fetch(`${API_URL}/ocr-extract`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}` 
          },
          body: JSON.stringify({ imageUrl: uploadData.file.fileUrl })
        });
        const ocrData = await ocrRes.json();
        
        setOcrResultText(ocrData.extractedText);
        onRefresh(); 
      }
    } catch (err) {
      alert("Eroare la procesarea OCR.");
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <section className="patient-card">
      <h3 className="card-title">OCR Text Extractor</h3>
      <p style={{ fontSize: '0.9em', color: '#555' }}>
        Upload a scan or photo (e.g., lab result, insurance card) to extract text.
      </p>
      
      <label htmlFor="ocr-upload" className="btn-primary" style={{ display: 'inline-block', cursor: 'pointer', padding: '8px 15px', marginTop: '10px' }}>
        {ocrLoading ? 'Processing...' : 'Upload Image & Extract Text'}
      </label>
      <input
        type="file"
        id="ocr-upload"
        accept="image/*,.pdf"
        onChange={handleOcrExtraction}
        disabled={ocrLoading}
        style={{ display: 'none' }}
      />

      {ocrResultText && (
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
          <h4>Extracted Text:</h4>
          <textarea
            value={ocrResultText}
            readOnly
            rows="6"
            style={{ width: '98%', marginBottom: '10px', padding: '8px', resize: 'none' }}
          />
          <button onClick={() => navigator.clipboard.writeText(ocrResultText)} className="btn-primary">
            Copy to Clipboard
          </button>
        </div>
      )}
    </section>
  );
}

export default OcrExtractor;
