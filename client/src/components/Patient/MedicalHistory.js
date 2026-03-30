import React, { useState } from 'react';
import API_URL from '../../apiConfig';

function MedicalHistory({ patient, user, onRefresh }) {
  const [recordType, setRecordType] = useState('Allergy');
  const [recordName, setRecordName] = useState('');
  const [recordSeverity, setRecordSeverity] = useState('');
  const [recordNotes, setRecordNotes] = useState('');

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
      const res = await fetch(`${API_URL}/patients/${patient.id}/medical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        onRefresh();
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
      const res = await fetch(`${API_URL}/medical/${recordId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` }
      });

      if (res.ok) {
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete record.');
      }
    } catch (err) {
      alert('Server error deleting medical record.');
    }
  };

  return (
    <section className="patient-card">
      <h3 className="card-title">Medical History & Alerts</h3>
      <form onSubmit={handleAddRecord} style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
        <h4 style={{ fontSize: '1rem', marginBottom: '10px' }}>Add New Item:</h4>
        <select value={recordType} onChange={e => setRecordType(e.target.value)} style={{ padding: '8px', marginRight: '10px', width: '120px' }}>
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
          placeholder="Notes (e.g., Causes rash...)" 
          value={recordNotes} 
          onChange={e => setRecordNotes(e.target.value)} 
          rows="1" 
          style={{ width: '100%', padding: '8px', marginTop: '10px' }}
        />
        <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>Add Record</button>
      </form>
      
      <ul className="notes-list">
        {(patient.MedicalRecords || []).map(record => (
          <li key={record.id} style={{ 
            padding: '10px', marginBottom: '10px', 
            borderLeft: record.type === 'Allergy' ? '4px solid #dc3545' : '4px solid #ffc107', 
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            backgroundColor: '#fffdfd', borderRadius: '4px'
          }}>
            <div style={{ flexGrow: 1 }}>
              <strong style={{ textTransform: 'uppercase', fontSize: '0.9em', color: record.type === 'Allergy' ? '#dc3545' : '#ffc107' }}>
                [{record.type}]
              </strong>
              <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>{record.name}</span>
              {record.severity && <em style={{ marginLeft: '10px', color: '#666' }}>({record.severity})</em>}
              {record.notes && <p style={{ margin: '5px 0 0 0', fontSize: '0.9em' }}>{record.notes}</p>}
            </div>
            <button onClick={() => handleDeleteRecord(record.id)} className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.8rem', marginLeft: '10px' }}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default MedicalHistory;
