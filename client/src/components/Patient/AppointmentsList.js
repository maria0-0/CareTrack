import React, { useState } from 'react';
import API_URL from '../../apiConfig';

function AppointmentsList({ patient, user, onRefresh }) {
  const [editingApptId, setEditingApptId] = useState(null);
  const [apptNoteContent, setApptNoteContent] = useState('');
  const [apptFileDescription, setApptFileDescription] = useState('');
  const [selectedApptFile, setSelectedApptFile] = useState(null); 
  const [apptUploadError, setApptUploadError] = useState(''); 
  const [editingFileId, setEditingFileId] = useState(null);
  const [editFileDescription, setEditFileDescription] = useState('');
  const [fullSizeUrl, setFullSizeUrl] = useState(null);

  const getFileUrl = (path) => {
    if (!path) return "";
    if (path.startsWith('http')) return path;
    return `${API_URL}${path}`;
  };

  const handleSaveApptNote = async (appointmentId) => {
    if (!user || !user.token) return;
    try {
      const res = await fetch(`${API_URL}/appointments/${appointmentId}/note`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ followUpNote: apptNoteContent }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onRefresh();
        setEditingApptId(null);
        setApptNoteContent('');
      } else {
        alert(data.message || 'Failed to update appointment note.');
      }
    } catch (err) {
      alert('Server error saving appointment note: ' + err.message);
    }
  };

  const handleAppointmentFileUpload = async (appointmentId) => {
    if (!selectedApptFile) return setApptUploadError('Please select a file to upload.');
    setApptUploadError('');

    const formData = new FormData();
    formData.append('file', selectedApptFile);
    formData.append('description', apptFileDescription);

    try {
      const res = await fetch(`${API_URL}/appointments/${appointmentId}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        alert('File uploaded successfully!');
        onRefresh();
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
        onRefresh();
      } else {
        alert('Failed to delete file.');
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
        onRefresh();
      } else {
        alert('Failed to update description.');
      }
    } catch (err) {
      alert('Server error saving description.');
    }
  };

  const now = new Date();
  const patientAppointments = patient.Appointments || [];
  
  const upcomingAppointments = patientAppointments
      .filter(appt => new Date(appt.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

  const pastAppointments = patientAppointments
      .filter(appt => new Date(appt.date) < now)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div>
      <section className="patient-card">
        <h3 className="card-title">Upcoming Appointments</h3>
        {upcomingAppointments.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {upcomingAppointments.map((appt) => (
              <li key={appt.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', marginBottom: '10px' }}>
                <strong>Date:</strong> {new Date(appt.date).toLocaleString()} <br />
                <strong>Reason:</strong> {appt.reason}
              </li>
            ))}
          </ul>
        ) : (
          <p>No upcoming appointments scheduled.</p>
        )}
      </section>

      <section className="patient-card">
        <h3 className="card-title">Past Appointments & Follow-up Notes</h3>
        {pastAppointments.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {pastAppointments.map((appt) => (
              <li key={appt.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                <p><strong>Date:</strong> {new Date(appt.date).toLocaleString()}</p>
                <p><strong>Reason:</strong> {appt.reason}</p>

                {editingApptId === appt.id ? (
                  <div>
                    <textarea value={apptNoteContent} onChange={(e) => setApptNoteContent(e.target.value)} placeholder="Write follow-up notes for this appointment..." rows="3" style={{ width: '97%', padding: '8px', marginBottom: '5px' }} />
                    <button onClick={() => handleSaveApptNote(appt.id)} style={{ marginRight: '5px' }}>Save Note</button>
                    <button onClick={() => setEditingApptId(null)}>Cancel</button>
                  </div>
                ) : (
                  <div>
                    <p>
                      <strong>Follow-up Note:</strong> 
                      {appt.followUpNote ? appt.followUpNote : <em style={{color: '#888'}}>None recorded.</em>}
                    </p>
                    <button onClick={() => { setEditingApptId(appt.id); setApptNoteContent(appt.followUpNote || ''); }} style={{ padding: '5px 10px', fontSize: '0.9rem' }}>
                      {appt.followUpNote ? 'Edit Note' : 'Add Follow-up Note'}
                    </button>
                  </div>
                )}

                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #e0e0e0' }}>
                  <h4>Add Attachment:</h4>
                  <input type="file" onChange={(e) => setSelectedApptFile(e.target.files[0])} style={{ marginBottom: '10px', display: 'block' }} />
                  <input type="text" placeholder="Description (optional)" value={apptFileDescription} onChange={(e) => setApptFileDescription(e.target.value)} style={{ padding: '8px', marginRight: '10px', width: '200px' }} />
                  <button onClick={() => handleAppointmentFileUpload(appt.id)} className="btn-primary" style={{ padding: '8px 15px' }}>Upload Photo</button>
                  {apptUploadError && <p style={{ color: 'red' }}>{apptUploadError}</p>}
                </div>
                
                {appt.AppointmentFiles && appt.AppointmentFiles.map((file) => (
                  <div key={file.id} className="file-card">
                    {editingFileId === file.id ? (
                      <div style={{ padding: '5px' }}>
                        <textarea value={editFileDescription} onChange={(e) => setEditFileDescription(e.target.value)} rows="2" style={{ width: '100%', marginBottom: '10px' }} />
                        <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                          <button onClick={() => handleSaveApptFileDescription(file.id)} className="btn-primary" style={{ padding: '5px' }}>Save</button>
                          <button onClick={() => setEditingFileId(null)} className="btn-secondary" style={{ padding: '5px' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <img 
                          src={getFileUrl(file.filePath || file.fileUrl)} 
                          alt={file.description || file.fileName}
                          onClick={() => setFullSizeUrl(getFileUrl(file.filePath || file.fileUrl))}
                          style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px', marginBottom: '10px', cursor: 'pointer' }}
                        />
                        <p style={{ fontSize: '0.9rem', margin: '0 0 5px 0' }}>{file.description || file.fileName}</p>
                        <div className="btn-action-group" style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                          <button onClick={() => { setEditingFileId(file.id); setEditFileDescription(file.description || ''); }} className="btn-warning" style={{ padding: '5px' }}>Edit Desc</button>
                          <button onClick={() => handleDeleteApptFile(file.id)} className="btn-danger" style={{ padding: '5px' }}>Delete</button>
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

      {/* Full size viewer modal */}
      {fullSizeUrl && (
        <div onClick={() => setFullSizeUrl(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <img src={fullSizeUrl} alt="Full view" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px' }} />
        </div>
      )}
    </div>
  );
}

export default AppointmentsList;
