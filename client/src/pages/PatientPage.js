import './PatientPage.css';
import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from "jspdf";


function PatientPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState('');
  
  // State for general notes
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editNoteText, setEditNoteText] = useState('');

  // State for appointment notes
  const [editingApptId, setEditingApptId] = useState(null);
  const [apptNoteContent, setApptNoteContent] = useState('');
  const [fileDescription, setFileDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null); // Will not be used for actual upload, just to show form is active
  const [uploadError, setUploadError] = useState('');
  const [fullSizeUrl, setFullSizeUrl] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [apptFileDescription, setApptFileDescription] = useState('');
  const [selectedApptFile, setSelectedApptFile] = useState(null); 
  const [apptUploadError, setApptUploadError] = useState(''); 
  const [editingFileId, setEditingFileId] = useState(null);
  const [editFileDescription, setEditFileDescription] = useState('');
  const [recordType, setRecordType] = useState('Allergy');
const [recordName, setRecordName] = useState('');
const [recordSeverity, setRecordSeverity] = useState('');
const [recordNotes, setRecordNotes] = useState('');
const [ocrLoading, setOcrLoading] = useState(false);
const [ocrResultText, setOcrResultText] = useState('');
const [templates, setTemplates] = useState([]); // Master templates
    const [editingForm, setEditingForm] = useState(null); // The form being actively completed
    const [formContent, setFormContent] = useState(''); // Content of the form being edited
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const sigCanvas = React.useRef(null);
    const clearSignature = () => sigCanvas.current.clear();




const getFileUrl = (path) => {
    if (!path) return "";
    // Dacă path-ul începe cu http, înseamnă că e un URL de S3 și îl dăm ca atare
    if (path.startsWith('http')) {
        return path;
    }
    // Dacă nu începe cu http, e un fișier vechi local, deci punem prefixul de server
    return `http://localhost:4000${path}`;
};


    const downloadFormPDF = (form) => {
        const doc = new jsPDF();
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        let currentY = 20;
    
        // --- ANTET ---
        doc.setFontSize(22);
        doc.setTextColor(0, 198, 167);
        doc.text("CARETRACK CLINIC", margin, currentY);
        currentY += 15;
    
        // --- CONȚINUT FORMULAR ---
        doc.setFontSize(11);
        doc.setTextColor(0);
        const splitText = doc.splitTextToSize(form.completedContent || form.content, pageWidth - (margin * 2));
        doc.text(splitText, margin, 70);
        
        currentY = 70 + (splitText.length * 7) + 20;
    
        // Verificare spațiu pagină
        if (currentY > 230) { doc.addPage(); currentY = 20; }
    
        // --- SECȚIUNE SEMNĂTURI ---
        // 1. SEMNĂTURA PACIENTULUI (din obiectul form)
        doc.setFont("helvetica", "bold");
        doc.text("Semnătură Pacient:", margin, currentY);
        if (form.signature) {
            // Luăm imaginea direct din formularul finalizat
            doc.addImage(form.signature, 'PNG', margin, currentY + 5, 45, 15);
        } else {
            doc.setFont("helvetica", "italic");
            doc.text("____________________ (nesemnat)", margin, currentY + 10);
        }

        const rightCol = pageWidth / 2 + 10;
doc.setFont("helvetica", "bold");
doc.text("Semnătură Medic:", rightCol, currentY);

if (user && user.signature) {
    try {
        // Parametri: imagine, format, x, y, lățime, înălțime
        doc.addImage(user.signature, 'PNG', rightCol, currentY + 5, 40, 15);
    } catch (imgError) {
        console.error("Eroare la adăugarea imaginii doctorului:", imgError);
        doc.setFontSize(8);
        doc.text("[Eroare format imagine]", rightCol, currentY + 10);
    }
} else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("__________________________", rightCol, currentY + 10);
    doc.text("(Semnătura neconfigurată)", rightCol, currentY + 15);
}
    
        currentY += 25;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Dr. ${user.lastName} ${user.firstName}`, rightCol, currentY);
    
        doc.save(`Document_${patient.name.replace(/\s+/g, '_')}.pdf`);
    };

  // --- API CALL ---

  const fetchPatient = async () => {
    try {
      const res = await fetch(`http://localhost:4000/patients/${id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        }
      });
      const data = await res.json();
      if (data.success) {
        setPatient(data.patient);
      } else {
        setError(data.message || 'Failed to fetch patient');
      }
    } catch (err) {
      setError('Server error: ' + err.message);
    }
  };

  const fetchTemplates = useCallback(async () => {
    try {
        const res = await fetch('http://localhost:4000/forms/templates', {
            headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await res.json();
        if (data.success) {
            setTemplates(data.templates);
            if (data.templates.length > 0) {
                 setSelectedTemplateId(data.templates[0].id); // Auto-select first template
            }
        }
    } catch (err) {
        console.error('Error fetching templates:', err);
    }
}, [user.token]);

  // --- HANDLERS ---
  const handlePrint = () => {
    window.print(); // Simply trigger the print dialog
};

  const handleSaveApptNote = async (appointmentId) => {
    if (!user || !user.token) { // ⭐️ CRITICAL FIX
        alert("Authentication failed. Please log in again.");
        return;
    }
    try {
        const res = await fetch(`http://localhost:4000/appointments/${appointmentId}/note`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user.token}`,
            },
            body: JSON.stringify({ followUpNote: apptNoteContent }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
            setPatient(prevPatient => ({
                ...prevPatient,
                Appointments: prevPatient.Appointments.map(appt => 
                    appt.id === appointmentId ? { ...appt, followUpNote: data.appointment.followUpNote } : appt
                ),
            }));
            setEditingApptId(null);
            setApptNoteContent('');
        } else {
            alert(data.message || 'Failed to update appointment note.');
        }
    } catch (err) {
        setError('Server error saving appointment note: ' + err.message);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!user || !user.token) { // ⭐️ CRITICAL FIX
        alert("Authentication failed. Please log in again.");
        return;
    }

    if (!newNoteContent.trim()) return;

    try {
        const res = await fetch(`http://localhost:4000/patients/${id}/notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user.token}`,
            },
            body: JSON.stringify({ content: newNoteContent }),
        });
        const data = await res.json();
        if (data.success) {
            setPatient(prevPatient => ({
                ...prevPatient,
                Notes: [data.note, ...prevPatient.Notes]
            }));
            setNewNoteContent('');
        } else {
            alert(data.message || 'Failed to add note');
        }
    } catch (err) {
        setError('Server error adding note: ' + err.message);
    }
  };

  // client/src/pages/PatientPage.js (Add these handlers)

  const handleFileChange = (e) => {

    setSelectedFile(e.target.files[0]);
  };


  const handleFileUpload = async (e) => {
    e.preventDefault();
    setUploadError('');

    if (!user || !user.token) { // ⭐️ CRITICAL FIX
        setUploadError("Authentication failed. Please log in again.");
        return;
    }

    if (!selectedFile) {
        setUploadError('Please select a file to upload.');
        return;
    }
    if (!fileDescription.trim()) {
        setUploadError('Please provide a description for the file.');
        return;
    }

    // ⭐️ CRITICAL: Use FormData for real file uploads
    const formData = new FormData();
    // 'patientFile' must match the string passed to multer in the backend (upload.single('patientFile'))
    formData.append('patientFile', selectedFile); 
    formData.append('description', fileDescription);

    try {
        const res = await fetch(`http://localhost:4000/patients/${id}/files`, {
            method: 'POST',
            // DO NOT set Content-Type header; browser handles it automatically for FormData
            headers: {
                Authorization: `Bearer ${user.token}`,
            },
            body: formData, // Send the FormData object
        });

        const data = await res.json();

        if (res.ok && data.success) {
            setPatient(prevPatient => ({
                ...prevPatient,
                PatientFiles: [data.file, ...(prevPatient.PatientFiles || [])]
            }));
            setFileDescription('');
            setSelectedFile(null); 
            e.target.reset(); // Reset the form fields, including the file input
        } else {
            setUploadError(data.message || 'Failed to upload file.');
        }
    } catch (err) {
        setUploadError('Server error uploading file: ' + err.message);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!user || !user.token) return;
    if (!window.confirm('Are you sure you want to delete this file record?')) return;

    try {
        // Adaugă /patients în fața rutei
        const res = await fetch(`http://localhost:4000/patients/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${user.token}`,
            },
        });

        if (res.ok) {
            setPatient(prevPatient => ({
                ...prevPatient,
                PatientFiles: (prevPatient.PatientFiles || []).filter(file => file.id !== fileId)
            }));
        } else {
            const data = await res.json();
            alert(data.message || 'Failed to delete file record.');
        }
    } catch (err) {
        // Aceasta este eroarea pe care o vezi acum
        alert('Server error deleting file: ' + err.message);
    }
};

// 1. Start Edit Mode
const handleStartEditNote = (note) => {
    setEditingNoteId(note.id);
    setEditNoteText(note.content);
};

  // 2. Save Edited Note
  const handleSaveNote = async (noteId) => {
    if (!user || !user.token) { 
        alert("Authentication failed. Please log in again.");
        return;
    }

    if (!editNoteText.trim()) {
        alert('Note content cannot be empty.');
        return;
    }

    try {
        const res = await fetch(`http://localhost:4000/notes/${noteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user.token}`,
            },
            body: JSON.stringify({ content: editNoteText }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
            // Update the note in local state with the returned updated note
            setPatient(prevPatient => ({
                ...prevPatient,
                Notes: (prevPatient.Notes || []).map(note => 
                    note.id === noteId ? data.note : note
                )
            }));
            setEditingNoteId(null); // Exit edit mode
            setEditNoteText('');
        } else {
            alert(data.message || 'Failed to update note.');
        }
    } catch (err) {
        alert('Server error saving note: ' + err.message);
    }
  };

  // 3. Delete Note
  const handleDeleteNote = async (noteId) => {
    
    if (!user || !user.token) { 
        alert("Authentication failed. Please log in again.");
        return;
    }

    if (!window.confirm('Are you sure you want to delete this general note?')) return;

    try {
        const res = await fetch(`http://localhost:4000/notes/${noteId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${user.token}`,
            },
        });

        // The status check handles success (200/204) and removes the note
        if (res.ok) {
            setPatient(prevPatient => ({
                ...prevPatient,
                // Filter out the deleted note
                Notes: (prevPatient.Notes || []).filter(note => note.id !== noteId)
            }));
        } else {
            const data = await res.json();
            alert(data.message || 'Failed to delete note.');
        }
    } catch (err) {
        alert('Server error deleting note: ' + err.message);
    }
  };

  // client/src/pages/PatientPage.js (inside PatientPage function)

// ⭐️ NEW: Handler for uploading file to an appointment
const handleAppointmentFileUpload = async (appointmentId) => {
    if (!selectedApptFile) {
        setApptUploadError('Please select a file to upload.');
        return;
    }

    setApptUploadError('');
    const formData = new FormData();
    formData.append('file', selectedApptFile);
    formData.append('description', apptFileDescription);

    try {
        const res = await fetch(`http://localhost:4000/appointments/${appointmentId}/files`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${user.token}`, // DO NOT set Content-Type, FormData handles it
            },
            body: formData,
        });

        const data = await res.json();
        if (data.success) {
            alert('File uploaded successfully!');
            fetchPatient(); // Reload patient data
            setSelectedApptFile(null);
            setApptFileDescription('');
        } else {
            setApptUploadError(data.message || 'File upload failed.');
        }
    } catch (err) {
        setApptUploadError('Server error during file upload.');
    }
};

const handleDeleteApptFile = async (fileId) => {
    if (!user || !user.token) return;
    if (!window.confirm('Are you sure you want to delete this appointment file?')) return;

    try {
        const res = await fetch(`http://localhost:4000/appointments/files/${fileId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${user.token}` },
        });

        if (res.ok) {
            alert('File deleted successfully.');
            fetchPatient(); // Reload patient data to refresh appointment files
        } else {
            const data = await res.json();
            alert(data.message || 'Failed to delete file.');
        }
    } catch (err) {
        alert('Server error deleting file.');
    }
};

const handleSaveApptFileDescription = async (fileId) => {
    if (!user || !user.token) return;
    if (!editFileDescription.trim()) return alert('Description cannot be empty.');

    try {
        const res = await fetch(`http://localhost:4000/appointments/files/${fileId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
            body: JSON.stringify({ description: editFileDescription }),
        });

        if (res.ok) {
            setEditingFileId(null);
            fetchPatient(); // Reload patient data to show updated description
        } else {
            const data = await res.json();
            alert(data.message || 'Failed to update description.');
        }
    } catch (err) {
        alert('Server error saving description.');
    }
};

const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!user || !user.token || !recordName.trim()) return alert("Name/Substance is required.");

    const payload = {
        type: recordType,
        name: recordName,
        severity: recordSeverity,
        notes: recordNotes
    };

    try {
        const res = await fetch(`http://localhost:4000/patients/${id}/medical`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            fetchPatient(); // Refresh patient data to show new record
            setRecordName('');
            setRecordSeverity('');
            setRecordNotes('');
        } else {
            alert(data.message || 'Failed to add record.');
        }
    } catch (err) {
        alert('Server error adding medical record.');
    }
};

const handleDeleteRecord = async (recordId) => {
    if (!user || !user.token) return;
    if (!window.confirm("Are you sure you want to delete this medical record?")) return;

    try {
        const res = await fetch(`http://localhost:4000/medical/${recordId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${user.token}` }
        });

        if (res.ok) {
            fetchPatient(); // Refresh patient data
        } else {
            const data = await res.json();
            alert(data.message || 'Failed to delete record.');
        }
    } catch (err) {
        alert('Server error deleting medical record.');
    }
};
const handleOcrExtraction = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setOcrLoading(true);

    // Pasul A: Mai întâi urcăm fișierul pe S3 (refolosim logica de upload existentă)
    const formData = new FormData();
    formData.append('patientFile', file);
    formData.append('description', 'OCR Scan');

    try {
        const uploadRes = await fetch(`http://localhost:4000/patients/${id}/files`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${user.token}` },
            body: formData
        });
        const uploadData = await uploadRes.json();

        if (uploadData.success) {
            // Pasul B: Trimitem URL-ul de S3 către ruta de OCR
            const ocrRes = await fetch('http://localhost:4000/ocr-extract', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}` 
                },
                body: JSON.stringify({ imageUrl: uploadData.file.fileUrl })
            });
            const ocrData = await ocrRes.json();
            
            setOcrResultText(ocrData.extractedText);
            fetchPatient(); // Refresh listă fișiere
        }
    } catch (err) {
        alert("Eroare la procesarea OCR.");
    } finally {
        setOcrLoading(false);
    }
};
const handleAssignForm = async () => {
    if (!selectedTemplateId) return alert('Please select a template.');

    try {
        const res = await fetch(`http://localhost:4000/forms/patients/${id}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
            body: JSON.stringify({ templateId: selectedTemplateId }),
        });
        const data = await res.json();
        
        if (data.success) {
            // Manually update the patient state to show the new form
            setPatient(prev => ({
                ...prev,
                PatientForms: [...(prev.PatientForms || []), data.form]
            }));
        } else {
            alert(data.message || 'Failed to assign form.');
        }
    } catch (err) {
        alert('Server error assigning form.');
    }
};


// ⭐️ NEW HANDLER: Start Editing a Form ⭐️
const handleStartEdit = async (form) => {
    setEditingForm(form);
    
    // ⭐️ SCHIMBARE: Dacă formularul are deja conținut (chiar și DRAFT), îl folosim pe acela
    if (form.completedContent || form.content) {
        setFormContent(form.completedContent || form.content);
    } else {
        // Dacă e prima dată, încercăm să-l luăm din template (backup)
        try {
            const res = await fetch(`http://localhost:4000/forms/templates/${form.templateId}`, {
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
    if (!sigCanvas.current) return;

    if (sigCanvas.current.isEmpty()) {
        return alert("Te rugăm să semnezi înainte de a finaliza.");
    }

    // ⭐️ FIX: Extragem imaginea direct de pe canvas, fără "trim"
    // sigCanvas.current.getCanvas() ne dă acces la elementul HTML5 nativ
    const canvas = sigCanvas.current.getCanvas();
    const signatureImage = canvas.toDataURL('image/png');

    if (!editingForm || !formContent.trim()) return;

    try {
        const res = await fetch(`http://localhost:4000/forms/${editingForm.id}/complete`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
            body: JSON.stringify({ 
                completedContent: formContent,
                signature: signatureImage 
            }),
        });
        
        const data = await res.json();
        
        if (data.success) {
            setPatient(prev => ({
                ...prev,
                PatientForms: prev.PatientForms.map(f => f.id === data.form.id ? data.form : f)
            }));
            setEditingForm(null);
            setFormContent('');
            alert('Formular salvat cu succes!');
        }
    } catch (err) {
        alert('Eroare la salvare.');
    }
};
const handleDeleteForm = async (formId) => {
    if (!window.confirm('Are you sure you want to delete this patient form instance?')) {
        return;
    }
    try {
        const res = await fetch(`http://localhost:4000/forms/${formId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${user.token}` },
        });

        if (res.ok) {
            alert('Form instance deleted.');
            // Update local state to remove the deleted form
            setPatient(prev => ({
                ...prev,
                PatientForms: prev.PatientForms.filter(f => f.id !== formId)
            }));
        } else {
            const data = await res.json();
            alert(data.message || 'Failed to delete form instance.');
        }
    } catch (err) {
        alert('Server error during form deletion.');
    }
};
const exportSinglePatientData = () => {
    if (!patient) {
        alert("Patient data not loaded.");
        return;
    }

    // 1. Compile Patient Details (Header Section)
    const details = [
        `Patient Name, ${patient.name}`,
        `Patient ID, ${patient.id}`,
        `Age, ${patient.age}`,
        `Birthday, ${patient.birthday ? new Date(patient.birthday).toLocaleDateString() : 'N/A'}`,
        `Phone, ${patient.phone || 'N/A'}`,
        `Email, ${patient.email || 'N/A'}`
    ].join('\n');

    // 2. Compile General Notes
    const generalNotes = patient.Notes && patient.Notes.length > 0
        ? ['\n\n--- GENERAL NOTES ---']
            .concat(patient.Notes.map(note => 
                `"${note.content.replace(/"/g, '""')}", ${new Date(note.createdAt).toLocaleString()}`
            ))
        : ['\n\n--- GENERAL NOTES ---', 'No general notes recorded.'];
    
    // 3. Compile Appointments and Follow-up Notes
    const appointmentsData = patient.Appointments && patient.Appointments.length > 0
        ? ['\n\n--- APPOINTMENTS AND FOLLOW-UPS ---']
            .concat(patient.Appointments.map(appt => 
                `Date, ${new Date(appt.date).toLocaleString()}, Reason, "${appt.reason.replace(/"/g, '""')}", Follow-up Note, "${(appt.followUpNote || '').replace(/"/g, '""')}"`
            ))
        : ['\n\n--- APPOINTMENTS AND FOLLOW-UPS ---', 'No appointments recorded.'];

    // 4. Compile File/Attachment Records
    const fileData = patient.PatientFiles && patient.PatientFiles.length > 0
        ? ['\n\n--- ATTACHMENT RECORDS ---']
            .concat(patient.PatientFiles.map(file => 
                `File Name, "${file.fileName}", Description, "${file.description || 'N/A'}", URL, ${file.fileUrl}`
            ))
        : ['\n\n--- ATTACHMENT RECORDS ---', 'No files recorded.'];

    // 5. Combine everything into one string
    const reportContent = [
        details,
        generalNotes.join('\n'),
        appointmentsData.join('\n'),
        fileData.join('\n')
    ].join('\n');

    // 6. Trigger Download
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Set file name
    link.href = URL.createObjectURL(blob);
    link.download = `caretrack_patient_${patient.id}_${patient.name.replace(/ /g, '_')}.txt`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert(`Successfully generated report for ${patient.name}.`);
};

  // --- EFFECT ---
  useEffect(() => {
    fetchPatient();
    fetchTemplates();
  }, [id, user.token,fetchTemplates]);

  // --- LOADING / ERROR GUARD CLAUSES ---
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!patient) return <p>Loading...</p>;

  // ⭐️ CRITICAL FIX: This logic ONLY runs after the 'if (!patient)' check passes.
  const now = new Date();
  const patientAppointments = patient.Appointments || [];
  
  const upcomingAppointments = patientAppointments
      .filter(appt => new Date(appt.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

  const pastAppointments = patientAppointments
      .filter(appt => new Date(appt.date) < now)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

  // --- RENDER (JSX) ---
  return (
<div className="patient-container">
          {/* Back to Dashboard Button */}
      <button 
        onClick={() => navigate('/dashboard')} 
        className="btn-primary" 
        style={{ 
            marginBottom: '20px', 
            marginRight: '10px', 
            backgroundColor: '#00c6a7', 
            color: 'white' 
        }}
    >
        ← Back to Dashboard
      </button>

      <button 
        onClick={exportSinglePatientData} 
        className="btn-primary" 
        style={{ marginBottom: '20px', marginRight: '10px',backgroundColor: '#00c6a7', color: 'white' }}
        title="Export all data, notes, and attachments for this patient."
    >
        📄 Export Patient Data
    </button>

    <button 
        onClick={handlePrint} 
        className="btn-primary" 
        style={{ marginBottom: '20px', backgroundColor: '#00c6a7', color: 'white' }} 
        title="Generate print view of the record."
    >
        🖨️ Print Record
    </button>
   
      <h2 className="patient-header">Patient Details: {patient.name}</h2>
      <h3 className="patient-info">Age: {patient.age}</h3>
      <div className="patient-info-details" style={{ marginBottom: '20px' }}>
    {/* ⭐️ DISPLAY NEW FIELDS ⭐️ */}
    <p>
        <strong>Birthday:</strong> {patient.birthday ? new Date(patient.birthday).toLocaleDateString() : 'N/A'}
    </p>
    <p>
        <strong>Phone:</strong> {patient.phone}
    </p>
    <p>
        <strong>Email:</strong> {patient.email || 'N/A'}
    </p>
</div>
<section className="patient-card">
                <h3 className="card-title">📝 Patient Agreements (ACORDs)</h3>
                
                {/* 1. Form Assignment Interface */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <select 
                        value={selectedTemplateId} 
                        onChange={e => setSelectedTemplateId(e.target.value)}
                        style={{ padding: '8px', flexGrow: 1 }}
                    >
                        <option value="">-- Select Template to Assign --</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                    </select>
                    <button 
                        onClick={handleAssignForm} 
                        className="btn-primary" 
                        disabled={!selectedTemplateId}
                    >
                        Assign New Agreement
                    </button>
                </div>

                {/* 2. List of Assigned Forms */}
                <ul className="data-list">
                    {patient.PatientForms && patient.PatientForms.map(form => (
                        <li key={form.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>
                                <strong>{form.title}</strong> 
                                <span style={{ marginLeft: '15px', color: form.status === 'COMPLETED' ? 'green' : 'orange', fontWeight: 'bold' }}>
                                    ({form.status})
                                </span>
                            </span>
                            <button 
                                onClick={() => handleStartEdit(form)} 
                                className="btn-primary"
                            >
                                {form.status === 'COMPLETED' ? 'View' : 'Complete Form'}
                            </button>
                            <button 
            onClick={() => handleDeleteForm(form.id)} 
            className="icon-button delete-btn"
            title="Delete Form Instance"
        >
            <span>🗑️</span>
                            </button>
                            <button 
    onClick={() => downloadFormPDF(form)} 
    className="btn-primary" 
    style={{ backgroundColor: '#2f3b52' }}
>
    📥 Descarcă PDF
</button>
                        </li>
                    ))}
                </ul>
            </section>

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
            <SignatureCanvas 
                ref={sigCanvas} // Legătura cu sigCanvas.current
                penColor='black'
                canvasProps={{
                    width: 580, 
                    height: 150, 
                    className: 'sigCanvas'
                }}
            />
        </div>
        <button 
            type="button" 
            onClick={clearSignature} 
            style={{ marginTop: '5px', fontSize: '0.7rem' }}
        >
            Șterge semnătura
        </button>
    </div>
)}
                       {/* 1. Butoanele de acțiune pentru formularele nefinalizate */}
                       {editingForm.status !== 'COMPLETED' && (
                            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                <button 
                                    onClick={handleCompleteForm} 
                                    className="btn-primary"
                                    style={{ backgroundColor: '#4CAF50' }} // Verde pentru salvare
                                >
                                    Finalizează și Salvează Acordul
                                </button>
                                <button 
                                    onClick={() => setEditingForm(null)} 
                                    className="btn-secondary"
                                >
                                    Anulează
                                </button>
                            </div>
                        )}

                        {/* 2. Butonul de închidere pentru formularele deja finalizate */}
                        {editingForm.status === 'COMPLETED' && (
                            <button 
                                onClick={() => setEditingForm(null)} 
                                className="btn-secondary" 
                                style={{ marginTop: '20px' }}
                            >
                                Închide Vizualizarea
                            </button>
                        )}

                        {/* 3. Afișarea semnăturii dacă există */}
                        {editingForm.status === 'COMPLETED' && editingForm.signature && (
                            <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                <p><strong>Semnătură Digitală:</strong></p>
                                <img 
                                    src={editingForm.signature} 
                                    alt="Semnatura" 
                                    style={{ border: '1px solid #ccc', maxWidth: '200px', backgroundColor: '#fff' }} 
                                />
                                <p style={{ fontSize: '0.8rem', color: '#888' }}>
                                    Document semnat electronic la data de {new Date(editingForm.updatedAt).toLocaleString()}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
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
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px',backgroundColor: '#f9f9f9' }}>
            <h4>Extracted Text:</h4>
            <textarea
                value={ocrResultText}
                readOnly
                rows="6"
                style={{ width: '98%', marginBottom: '10px', padding: '8px', resize: 'none' }}
                // Allows the user to easily select and copy the text
            />
            <button 
                onClick={() => navigator.clipboard.writeText(ocrResultText)} 
                className="btn-primary"
            >
                Copy to Clipboard
            </button>
        </div>
    )}
</section>
      <div className="content-grid"> {/* Start two-column grid */}
        
        {/* ======================= LEFT COLUMN ======================= */}
        <div>
        <section className="patient-card">
    <h3 className="card-title">Medical History & Alerts</h3>

    {/* Input Form */}
    <form onSubmit={handleAddRecord} style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
        <h4 style={{ fontSize: '1rem', marginBottom: '10px' }}>Add New Item:</h4>
        <select 
            value={recordType} 
            onChange={e => setRecordType(e.target.value)} 
            style={{ padding: '8px', marginRight: '10px', width: '120px' }}
        >
            <option value="Allergy">Allergy</option>
            <option value="Condition">Condition</option>
            <option value="Medication">Medication</option>
        </select>
        <input 
            type="text" 
            placeholder="Name (e.g., Penicillin)" 
            value={recordName} 
            onChange={e => setRecordName(e.target.value)} 
            required 
            style={{ padding: '8px', marginRight: '10px', width: '150px' }} 
        />
        <input 
            type="text" 
            placeholder="Severity/Dosage" 
            value={recordSeverity} 
            onChange={e => setRecordSeverity(e.target.value)} 
            style={{ padding: '8px', width: '120px' }} 
        />
        <textarea 
            placeholder="Notes (e.g., Causes rash, Since 2010)" 
            value={recordNotes} 
            onChange={e => setRecordNotes(e.target.value)} 
            rows="1" 
            style={{ width: '100%', padding: '8px', marginTop: '10px' }}
        />
        <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>Add Record</button>
    </form>
    
    {/* Display Records */}
    <ul className="notes-list">
        {(patient.MedicalRecords || []).map(record => (
            <li key={record.id} style={{ 
                padding: '10px', 
                marginBottom: '10px', 
                // Highlight Allergies in red for safety!
                borderLeft: record.type === 'Allergy' ? '4px solid #dc3545' : '4px solid #ffc107', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                backgroundColor: '#fffdfd',
                borderRadius: '4px'
            }}>
                <div style={{ flexGrow: 1 }}>
                    <strong style={{ textTransform: 'uppercase', fontSize: '0.9em', 
                        color: record.type === 'Allergy' ? '#dc3545' : '#ffc107' }}>
                        [{record.type}]
                    </strong>
                    <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>{record.name}</span>
                    {record.severity && <em style={{ marginLeft: '10px', color: '#666' }}>({record.severity})</em>}
                    {record.notes && <p style={{ margin: '5px 0 0 0', fontSize: '0.9em' }}>{record.notes}</p>}
                </div>
                <button 
                    onClick={() => handleDeleteRecord(record.id)}
                    className="btn-danger" 
                    style={{ padding: '4px 8px', fontSize: '0.8rem', marginLeft: '10px' }}
                >
                    Delete
                </button>
            </li>
        ))}
    </ul>
</section>
        <section className="patient-card">
        <h3 className="card-title">General Patient Notes</h3>
        {/* Note Submission Form */}
        <form onSubmit={handleAddNote} style={{ marginBottom: '15px' }}>
            <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Add a general note..."
                rows="3"
                style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
                required
            />
            <button type="submit">Save General Note</button>
        </form>

        {/* Display Notes */}
        {(patient.Notes || []).length > 0 ? (
         <ul className="notes-list">
         {(patient.Notes || []).map((note) => (
             <li 
             key={note.id} 
             className={editingNoteId === note.id ? "note-item editing" : "note-item"}
             >
                <div className="note-content">
                 {editingNoteId === note.id ? (
                    <textarea
                    value={editNoteText}
                    onChange={(e) => setEditNoteText(e.target.value)}
                    // ⭐️ Ensure no conflicting width/height styles are here
                    style={{ width: '100%', minHeight: '100px', marginBottom: '10px' }} 
                />
            ) : (
                // DISPLAY MODE: Paragraph
                <p 
                    // ⭐️ ESSENTIAL: This style forces the note text to respect line breaks
                    style={{ whiteSpace: 'pre-wrap' }}
                >
                    {note.content}
                </p>
            )}
            <small style={{ color: '#888' }}>
                Last Updated: {new Date(note.updatedAt).toLocaleString()}
            </small>
        </div>
    
    {editingNoteId === note.id ? (
    <div className="note-actions" >
        <button onClick={() => handleSaveNote(note.id)} className="btn-primary">Save</button>
        <button onClick={() => setEditingNoteId(null)} className="btn-secondary">Cancel</button>
    </div>
) : (
    // Display Mode buttons
    <div className="note-actions">
        <button 
            onClick={() => handleStartEditNote(note)}
            className="btn-primary"
        >
            Edit
        </button>
        <button 
            onClick={() => handleDeleteNote(note.id)}
            className="btn-danger"
        >
            Delete
        </button>
    </div>
)}
             </li>
         ))}
     </ul>
        ) : (
          <p>No general notes yet.</p>
        )}
      </section>

      <section className="patient-card">
      <h3 className="card-title">Upcoming Appointments</h3>
          {upcomingAppointments.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                  {upcomingAppointments.map((appt) => (
                      <li 
                          key={appt.id} 
                          style={{ borderBottom: '1px solid #eee', padding: '10px 0', marginBottom: '10px' }}
                      >
                          <strong>Date:</strong> {new Date(appt.date).toLocaleString()} <br />
                          <strong>Reason:</strong> {appt.reason}
                      </li>
                  ))}
              </ul>
          ) : (
              <p>No upcoming appointments scheduled.</p>
          )}
      </section>
      {/* ------------------- Past Appointments & Notes ------------------- */}
      <section className="patient-card">
                <h3 className="card-title">Past Appointments & Follow-up Notes</h3>
          {pastAppointments.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                  {pastAppointments.map((appt) => (
                      <li 
                          key={appt.id} 
                          style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}
                      >
                          <p><strong>Date:</strong> {new Date(appt.date).toLocaleString()}</p>
                          <p><strong>Reason:</strong> {appt.reason}</p>

                          {editingApptId === appt.id ? (
                              // --- EDIT MODE UI ---
                              <div>
                                  <textarea
                                      value={apptNoteContent}
                                      onChange={(e) => setApptNoteContent(e.target.value)}
                                      placeholder="Write follow-up notes for this appointment..."
                                      rows="3"
                                      style={{ width: '97%', padding: '8px', marginBottom: '5px' }}
                                  />
                                  <button onClick={() => handleSaveApptNote(appt.id)} style={{ marginRight: '5px' }}>
                                      Save Note
                                  </button>
                                  <button onClick={() => setEditingApptId(null)}>Cancel</button>
                              </div>
                          ) : (
                              // --- VIEW MODE UI ---
                              <div>
                                  <p>
                                      <strong>Follow-up Note:</strong> 
                                      {appt.followUpNote ? appt.followUpNote : <em style={{color: '#888'}}>None recorded.</em>}
                                  </p>
                                  <button 
                                      onClick={() => {
                                          setEditingApptId(appt.id);
                                          setApptNoteContent(appt.followUpNote || '');
                                      }}
                                      style={{ padding: '5px 10px', fontSize: '0.9rem' }}
                                  >
                                      {appt.followUpNote ? 'Edit Note' : 'Add Follow-up Note'}
                                  </button>
                              </div>
                          )}

<div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #e0e0e0' }}>
        <h4>Add Attachment:</h4>
        <input 
            type="file" 
            onChange={(e) => setSelectedApptFile(e.target.files[0])}
            style={{ marginBottom: '10px', display: 'block' }}
        />
        <input 
            type="text" 
            placeholder="Description (optional)"
            value={apptFileDescription}
            onChange={(e) => setApptFileDescription(e.target.value)}
            style={{ padding: '8px', marginRight: '10px', width: '200px' }}
        />
        <button 
            onClick={() => handleAppointmentFileUpload(appt.id)}
            className="btn-primary"
            style={{ padding: '8px 15px' }}
        >
            Upload Photo
        </button>
        {apptUploadError && <p style={{ color: 'red' }}>{apptUploadError}</p>}
    </div>


    
    {/* ⭐️ NEW: Display Appointment Attachments */}
    {appt.AppointmentFiles.map((file) => (
    <div key={file.id} className="file-card">
        
        {editingFileId === file.id ? (
            // --- FILE EDIT MODE: Show Text Area and Save Buttons ---
            <div style={{ padding: '5px' }}>
                <textarea
                    // Bind to the state for the description being edited
                    value={editFileDescription}
                    onChange={(e) => setEditFileDescription(e.target.value)}
                    rows="2"
                    style={{ width: '100%', marginBottom: '10px' }}
                />
                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                    <button 
                        onClick={() => handleSaveApptFileDescription(file.id)} 
                        className="btn-primary" 
                        style={{ padding: '5px' }}
                    >
                        Save
                    </button>
                    <button 
                        onClick={() => setEditingFileId(null)} 
                        className="btn-secondary" 
                        style={{ padding: '5px' }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        ) : (
            // --- FILE VIEW MODE: Show Image, Description, and Actions ---
            <>
                <img 
    src={getFileUrl(file.filePath || file.fileUrl)} // Folosim helper-ul aici
    alt={file.description || file.fileName}
    onClick={() => setFullSizeUrl(getFileUrl(file.filePath || file.fileUrl))}
    style={{ 
        width: '100%', 
        maxHeight: '200px', 
        objectFit: 'cover', 
        borderRadius: '4px', 
        marginBottom: '10px', 
        cursor: 'pointer' 
    }}
/>
                
                <p style={{ fontSize: '0.9rem', margin: '0 0 5px 0' }}>
                    {file.description || file.fileName}
                </p>

                <div className="btn-action-group" style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                    <button 
                        onClick={() => { 
                            setEditingFileId(file.id); 
                            setEditFileDescription(file.description || ''); // Load current description into state
                        }}
                        className="btn-warning" 
                        style={{ padding: '5px' }}
                    >
                        Edit Desc
                    </button>
                    <button 
                        onClick={() => handleDeleteApptFile(file.id)}
                        className="btn-danger" 
                        style={{ padding: '5px' }}
                    >
                        Delete
                    </button>
                </div>
            </>
        )}
    </div>
))}
                      </li>
                  ))}
              </ul>
          ) : (
              <p>No past appointments recorded for this patient.</p>
          )}
      </section>


      </div>

{/* ======================= RIGHT COLUMN ======================= */}
        <div>
{/* ------------------- Patient Files/Photos ------------------- */}
<section className="patient-card">
     <h3 className="card-title">Patient Files & Photos</h3>
    {/* File Upload Form (Mock) */}
    <form onSubmit={handleFileUpload} style={{ marginBottom: '25px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h4>Add New File Record</h4>
        <input 
            type="file" 
            onChange={handleFileChange} 
            // In a real app, this would be crucial for a genuine upload
            // required
            style={{ marginBottom: '10px', display: 'block' }}
        />
        <textarea
            value={fileDescription}
            onChange={(e) => setFileDescription(e.target.value)}
            placeholder="Description of this file/photo..."
            rows="2"
            style={{ width: '97%', padding: '8px', marginBottom: '10px' }}
            required
        />
        {uploadError && <p style={{ color: 'red', margin: '5px 0' }}>{uploadError}</p>}
        <button type="submit">
            {/* Displaying a mock name based on description for simplicity */}
            Save File Record 
        </button>
    </form>


    {/* Display Files */}
    {(patient.PatientFiles || []).length > 0 ? (
        <div className="file-grid">
            {(patient.PatientFiles || []).map((file) => (

<div 
    key={file.id} 
    style={{ border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '10px', 
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)', // Subtle shadow
        backgroundColor: '#fafafa',
    }}
    >
    <div 
        onClick={() => setFullSizeUrl(`http://localhost:4000${file.fileUrl}`)} 
        style={{ cursor: 'pointer', marginBottom: '10px' }}
        title="Click to view full size"
    >
    <img 
    src={getFileUrl(file.filePath || file.fileUrl)} // Folosim helper-ul aici
    alt={file.description || file.fileName}
    onClick={() => setFullSizeUrl(getFileUrl(file.filePath || file.fileUrl))}
    style={{ 
        width: '100%', 
        maxHeight: '200px', 
        objectFit: 'cover', 
        borderRadius: '4px', 
        marginBottom: '10px', 
        cursor: 'pointer' 
    }}
/>
    </div>
    
    <p style={{ margin: '0 0 5px 0' }}>
        <strong>Description:</strong> {file.description}
    </p>
    
    <small style={{ color: '#888', display: 'block', marginBottom: '10px' }}>
        Added: {new Date(file.createdAt).toLocaleDateString()}
    </small>
    
    <button 
        onClick={() => handleDeleteFile(file.id)} 
        style={{ 
            backgroundColor: '#f44336', 
            color: 'white', 
            border: 'none', 
            padding: '5px 10px', 
            borderRadius: '4px',
            cursor: 'pointer'
        }}
    >
        Delete
    </button>
</div>
            ))}
        </div>
    ) : (
        <p>No files or photos recorded for this patient yet.</p>
    )}
</section>
</div>
</div>
      
      
      {/* Existing General Notes Section */}
      
      {fullSizeUrl && (
  <div 
    onClick={() => setFullSizeUrl(null)}
    style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.9)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000,
    }}
  >
    <img 
      alt="Full size view" 
      src={
        /* 1. Verificăm dacă URL-ul conține deja Amazon S3 oriunde în el */
        fullSizeUrl.includes('amazonaws.com') 
          ? (fullSizeUrl.includes('http://localhost:4000') 
              ? fullSizeUrl.split('http://localhost:4000')[1] // Dacă e lipit de localhost, îl tăiem și luăm doar partea cu https
              : fullSizeUrl)
          : (fullSizeUrl.startsWith('http') 
              ? fullSizeUrl 
              : `http://localhost:4000${fullSizeUrl}`)
      } 
      style={{ 
        maxWidth: '90%', maxHeight: '90%', 
        objectFit: 'contain', borderRadius: '8px' 
      }} 
    />
  </div>
)}

    </div>
    
  );
}

export default PatientPage;