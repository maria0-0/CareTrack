import React, { useState, useEffect, useRef, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import API_URL from '../../apiConfig';

function PatientAgreements({ patient, user, onRefresh }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [editingForm, setEditingForm] = useState(null);
  const [formContent, setFormContent] = useState('');
  const sigCanvas = useRef(null);

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/forms/templates`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
        if (data.templates.length > 0) setSelectedTemplateId(data.templates[0].id);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  }, [user.token]);

  const toDataURL = async (url) => {
    try {
      console.log(`[PDF] Fetching signature via proxy from: ${url}`);
      // Use the backend proxy to bypass CORS
      const proxyUrl = `${API_URL}/proxy-image?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error(`[PDF] Error in toDataURL for ${url}:`, err);
      throw err;
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const downloadFormPDF = async (form) => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;

    doc.setFontSize(22);
    doc.setTextColor(0, 198, 167);
    doc.text("CARETRACK CLINIC", margin, currentY);
    currentY += 15;

    doc.setFontSize(11);
    doc.setTextColor(0);
    const splitText = doc.splitTextToSize(form.completedContent || form.content, pageWidth - (margin * 2));
    doc.text(splitText, margin, 70);
    currentY = 70 + (splitText.length * 7) + 20;

    if (currentY > 230) { doc.addPage(); currentY = 20; }

    doc.setFont("helvetica", "bold");
    doc.text("Semnatura Pacient:", margin, currentY);

    if (form.signature) {
      try {
        const patientSigData = form.signature.startsWith('data:')
          ? form.signature
          : await toDataURL(form.signature);
        doc.addImage(patientSigData, 'PNG', margin, currentY + 5, 45, 15);
      } catch (e) {
        console.error("Error adding patient signature:", e);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.text("[Eroare format semnatura pacient]", margin, currentY + 10);
      }
    } else {
      doc.setFont("helvetica", "italic");
      doc.text("____________________ (nesemnat)", margin, currentY + 10);
    }

    const rightCol = pageWidth / 2 + 10;
    doc.setFont("helvetica", "bold");
    doc.text("Semnatura Medic:", rightCol, currentY);

    if (user && user.signature) {
      try {
        const doctorSigData = user.signature.startsWith('data:')
          ? user.signature
          : await toDataURL(user.signature);
        doc.addImage(doctorSigData, 'PNG', rightCol, currentY + 5, 40, 15);
      } catch (e) {
        console.error("Error adding doctor signature:", e);
        doc.setFontSize(8);
        doc.text("[Eroare format imagine medic]", rightCol, currentY + 10);
      }
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text("__________________________", rightCol, currentY + 10);
      doc.text("(Semnatura neconfigurata)", rightCol, currentY + 15);
    }

    currentY += 25;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Dr. ${user.lastName} ${user.firstName}`, rightCol, currentY);
    doc.save(`Document_${patient.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleAssignForm = async () => {
    if (!selectedTemplateId) return alert('Please select a template.');
    try {
      const res = await fetch(`${API_URL}/forms/patients/${patient.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ templateId: selectedTemplateId }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(data.message || 'Failed to assign form.');
      }
    } catch (err) {
      alert('Server error assigning form.');
    }
  };

  const handleStartEdit = async (form) => {
    setEditingForm(form);
    if (form.completedContent || form.content) {
      setFormContent(form.completedContent || form.content);
    } else {
      try {
        const res = await fetch(`${API_URL}/forms/templates/${form.templateId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await res.json();
        if (data.success) setFormContent(data.template.content);
      } catch (err) {
        console.error('Error loading content');
      }
    }
  };

  const handleCompleteForm = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) return alert("Te rugăm să semnezi înainte de a finaliza.");
    const signatureImage = sigCanvas.current.getCanvas().toDataURL('image/png');
    if (!editingForm || !formContent.trim()) return;

    try {
      const res = await fetch(`${API_URL}/forms/${editingForm.id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ completedContent: formContent, signature: signatureImage }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingForm(null);
        setFormContent('');
        alert('Formular salvat cu succes!');
        onRefresh();
      }
    } catch (err) {
      alert('Eroare la salvare.');
    }
  };

  const handleDeleteForm = async (formId) => {
    if (!window.confirm('Are you sure you want to delete this patient form instance?')) return;
    try {
      const res = await fetch(`${API_URL}/forms/${formId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        alert('Form instance deleted.');
        onRefresh();
      } else {
        alert('Failed to delete form instance.');
      }
    } catch (err) {
      alert('Server error during form deletion.');
    }
  };

  return (
    <section className="patient-card">
      <h3 className="card-title">📝 Patient Agreements (ACORDs)</h3>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} style={{ padding: '8px', flexGrow: 1 }}>
          <option value="">-- Select Template to Assign --</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <button onClick={handleAssignForm} className="btn-primary" disabled={!selectedTemplateId}>
          Assign New Agreement
        </button>
      </div>

      <ul className="data-list">
        {patient.PatientForms && patient.PatientForms.map(form => (
          <li key={form.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <strong>{form.title}</strong>
              <span style={{ marginLeft: '15px', color: form.status === 'COMPLETED' ? 'green' : 'orange', fontWeight: 'bold' }}>({form.status})</span>
            </span>
            <button onClick={() => handleStartEdit(form)} className="btn-primary">{form.status === 'COMPLETED' ? 'View' : 'Complete Form'}</button>
            <button onClick={() => handleDeleteForm(form.id)} className="icon-button delete-btn" title="Delete Form Instance"><span>🗑️</span></button>
            <button onClick={() => downloadFormPDF(form)} className="btn-primary" style={{ backgroundColor: '#2f3b52' }}>📥 Descarcă PDF</button>
          </li>
        ))}
      </ul>

      {editingForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '600px' }}>
            <h3>Completing: {editingForm.title}</h3>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows="15"
              placeholder="Enter the final content of the agreement here..."
              style={{ width: '100%', padding: '10px', marginBottom: '15px' }}
              readOnly={editingForm.status === 'COMPLETED'}
            />

            {editingForm.status !== 'COMPLETED' && (
              <div style={{ marginTop: '15px', padding: '10px', border: '1px solid #eee', background: '#f9f9f9' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Semnează aici:</p>
                <div style={{ background: '#fff', border: '1px solid #ccc' }}>
                  <SignatureCanvas ref={sigCanvas} penColor='black' canvasProps={{ width: 580, height: 150, className: 'sigCanvas' }} />
                </div>
                <button type="button" onClick={clearSignature} style={{ marginTop: '5px', fontSize: '0.7rem' }}>Șterge semnătura</button>
              </div>
            )}

            {editingForm.status !== 'COMPLETED' ? (
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button onClick={handleCompleteForm} className="btn-primary" style={{ backgroundColor: '#4CAF50' }}>Finalizează și Salvează Acordul</button>
                <button onClick={() => setEditingForm(null)} className="btn-secondary">Anulează</button>
              </div>
            ) : (
              <button onClick={() => setEditingForm(null)} className="btn-secondary" style={{ marginTop: '20px' }}>Închide Vizualizarea</button>
            )}

            {editingForm.status === 'COMPLETED' && editingForm.signature && (
              <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <p><strong>Semnătură Digitală:</strong></p>
                <img src={editingForm.signature} alt="Semnătură" style={{ border: '1px solid #ccc', maxWidth: '200px', backgroundColor: '#fff' }} />
                <p style={{ fontSize: '0.8rem', color: '#888' }}>Document semnat la {new Date(editingForm.updatedAt).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default PatientAgreements;
