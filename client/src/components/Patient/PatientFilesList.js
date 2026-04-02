import React, { useState } from 'react';
import API_URL from '../../apiConfig';

function PatientFilesList({ patient, user, onRefresh }) {
  const [fileDescription, setFileDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [fullSizeUrl, setFullSizeUrl] = useState(null);

  const getFileUrl = (path) => {
    if (!path) return "";
    if (path.startsWith('http')) return path;
    return `${API_URL}${path}`;
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    setUploadError('');

    if (!user || !user.token) return setUploadError("Authentication failed.");
    if (!selectedFile) return setUploadError('Please select a file to upload.');
    if (!fileDescription.trim()) return setUploadError('Please provide a description.');

    const formData = new FormData();
    formData.append('patientFile', selectedFile); 
    formData.append('description', fileDescription);

    try {
      const res = await fetch(`${API_URL}/patients/${patient.id}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFileDescription('');
        setSelectedFile(null); 
        e.target.reset();
        onRefresh();
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
      const res = await fetch(`${API_URL}/patients/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (res.ok) {
        onRefresh();
      } else {
        alert('Failed to delete file record.');
      }
    } catch (err) {
      alert('Server error deleting file: ' + err.message);
    }
  };

  return (
    <section className="patient-card">
      <h3 className="card-title">Patient Files & Photos</h3>
      <form onSubmit={handleFileUpload} style={{ marginBottom: '25px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h4>Add New File Record</h4>
        <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} style={{ marginBottom: '10px', display: 'block' }} />
        <textarea
          value={fileDescription}
          onChange={(e) => setFileDescription(e.target.value)}
          placeholder="Description of this file/photo..."
          rows="2"
          style={{ width: '97%', padding: '8px', marginBottom: '10px' }}
          required
        />
        {uploadError && <p style={{ color: 'red', margin: '5px 0' }}>{uploadError}</p>}
        <button type="submit">Save File Record</button>
      </form>

      {(() => {
        const filteredFiles = (patient.PatientFiles || []).filter(file => file.description !== 'OCR Scan');
        
        return filteredFiles.length > 0 ? (
          <div className="file-grid">
            {filteredFiles.map((file) => (
              <div key={file.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', backgroundColor: '#fafafa' }}>
                <div onClick={() => setFullSizeUrl(getFileUrl(file.filePath || file.fileUrl))} style={{ cursor: 'pointer', marginBottom: '10px' }} title="Click to view full size">
                  <img 
                    src={getFileUrl(file.filePath || file.fileUrl)} 
                    alt={file.description || file.fileName}
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px', marginBottom: '10px' }}
                  />
                </div>
                <p style={{ margin: '0 0 5px 0' }}><strong>Description:</strong> {file.description}</p>
                <small style={{ color: '#888', display: 'block', marginBottom: '10px' }}>
                  Added: {new Date(file.createdAt).toLocaleDateString()}
                </small>
                <button onClick={() => handleDeleteFile(file.id)} style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>No files or photos recorded for this patient yet.</p>
        );
      })()}

      {/* Full size viewer modal */}
      {fullSizeUrl && (
        <div onClick={() => setFullSizeUrl(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <img src={fullSizeUrl} alt="Full view" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px' }} />
        </div>
      )}
    </section>
  );
}

export default PatientFilesList;
