import React from 'react';
import { useNavigate } from 'react-router-dom';

function PatientHeader({ patient }) {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  const exportSinglePatientData = () => {
    if (!patient) return alert("Patient data not loaded.");

    const details = [
      `Patient Name, ${patient.name}`,
      `Patient ID, ${patient.id}`,
      `Age, ${patient.age}`,
      `Birthday, ${patient.birthday ? new Date(patient.birthday).toLocaleDateString() : 'N/A'}`,
      `Phone, ${patient.phone || 'N/A'}`,
      `Email, ${patient.email || 'N/A'}`
    ].join('\n');

    const generalNotes = patient.Notes && patient.Notes.length > 0
      ? ['\n\n--- GENERAL NOTES ---']
          .concat(patient.Notes.map(note => `"${note.content.replace(/"/g, '""')}", ${new Date(note.createdAt).toLocaleString()}`))
      : ['\n\n--- GENERAL NOTES ---', 'No general notes recorded.'];
    
    const appointmentsData = patient.Appointments && patient.Appointments.length > 0
      ? ['\n\n--- APPOINTMENTS AND FOLLOW-UPS ---']
          .concat(patient.Appointments.map(appt => 
            `Date, ${new Date(appt.date).toLocaleString()}, Reason, "${appt.reason.replace(/"/g, '""')}", Follow-up Note, "${(appt.followUpNote || '').replace(/"/g, '""')}"`
          ))
      : ['\n\n--- APPOINTMENTS AND FOLLOW-UPS ---', 'No appointments recorded.'];

    const fileData = patient.PatientFiles && patient.PatientFiles.length > 0
      ? ['\n\n--- ATTACHMENT RECORDS ---']
          .concat(patient.PatientFiles.map(file => 
            `File Name, "${file.fileName}", Description, "${file.description || 'N/A'}", URL, ${file.fileUrl}`
          ))
      : ['\n\n--- ATTACHMENT RECORDS ---', 'No files recorded.'];

    const reportContent = [details, generalNotes.join('\n'), appointmentsData.join('\n'), fileData.join('\n')].join('\n');

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `caretrack_patient_${patient.id}_${patient.name.replace(/ /g, '_')}.txt`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert(`Successfully generated report for ${patient.name}.`);
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => navigate('/dashboard')} className="btn-primary" style={{ marginRight: '10px', backgroundColor: '#00c6a7', color: 'white' }}>
          ← Back to Dashboard
        </button>
        <button onClick={exportSinglePatientData} className="btn-primary" style={{ marginRight: '10px', backgroundColor: '#00c6a7', color: 'white' }} title="Export all data, notes, and attachments">
          📄 Export Patient Data
        </button>
        <button onClick={handlePrint} className="btn-primary" style={{ backgroundColor: '#00c6a7', color: 'white' }} title="Generate print view">
          🖨️ Print Record
        </button>
      </div>

      <h2 className="patient-header">Patient Details: {patient.name}</h2>
      <h3 className="patient-info">Age: {patient.age}</h3>
      <div className="patient-info-details" style={{ marginBottom: '20px' }}>
        <p><strong>Birthday:</strong> {patient.birthday ? new Date(patient.birthday).toLocaleDateString() : 'N/A'}</p>
        <p><strong>Phone:</strong> {patient.phone}</p>
        <p><strong>Email:</strong> {patient.email || 'N/A'}</p>
      </div>
    </div>
  );
}

export default PatientHeader;
