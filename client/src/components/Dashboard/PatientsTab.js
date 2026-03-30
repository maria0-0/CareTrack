import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import EditPatientForm from '../../pages/EditPatientForm';
import API_URL from '../../apiConfig';

function PatientsTab({ 
  user, 
  patients, 
  setPatients,
  fetchPatients, 
  searchTerm, 
  setSearchTerm, 
  currentPage, 
  setCurrentPage, 
  totalPages 
}) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [birthday, setBirthday] = useState(''); 
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');   
  const [error, setError] = useState('');
  const [editingPatientId, setEditingPatientId] = useState(null);

  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (!name || !age || !birthday || !phone || !email) {
      setError('Please enter name, age, birthday, phone, and email');
      return;
    }
    setError('');

    try {
      const res = await fetch(`${API_URL}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ name, age: Number(age), birthday, phone, email }),
      });
  
      const data = await res.json();
      if (data.success) {
        setName('');
        setAge('');
        setBirthday('');
        setPhone('');
        setEmail('');        
        await fetchPatients();
      } else {
        setError(data.message || 'Failed to add patient');
      }
    } catch (err) {
      setError('Server error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!user || !user.token) return alert("Authentication failed. Please log in again.");
    if (!window.confirm('WARNING: Are you sure you want to permanently delete this patient and all their associated records (appointments, notes, files)?')) return;
    
    try {
      const res = await fetch(`${API_URL}/patients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPatients(patients.filter((p) => p.id !== id));
      } else {
        alert(data.message || 'Failed to delete');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Server error');
    }
  };

  const handleSaveEdit = (updatedPatient) => {
    setPatients((prev) => prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p)));
    setEditingPatientId(null);
  };

  const exportPatientsToCSV = () => {
    if (patients.length === 0) return alert("No patient data to export.");
  
    const headers = ['ID', 'Name', 'Age', 'Birthday', 'Phone', 'Email', 'Created At'];
    
    const csvRows = patients.map(patient => [
        patient.id,
        `"${patient.name}"`, 
        patient.age,
        patient.birthday ? new Date(patient.birthday).toLocaleDateString('en-CA') : 'N/A', 
        `"${patient.phone || 'N/A'}"`,
        `"${patient.email || 'N/A'}"`,
        new Date(patient.createdAt).toLocaleDateString(),
    ].join(','));
  
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    link.href = URL.createObjectURL(blob);
    link.download = `caretrack_patients_${new Date().toISOString().slice(0, 10)}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert(`Successfully exported ${patients.length} patients to CSV.`);
  };

  return (
    <>
      <section className="dashboard-section">
        <h3>Add New Patient</h3>
        <form onSubmit={handleAddPatient} className="form-row">
            <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="number" placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} />
            <input type="date" placeholder="Birthday" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
            <input type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit" className="btn-primary">Add Patient</button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </section>

      <section className="dashboard-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Patient List</h3>
          <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '10px', width: '300px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
          <button onClick={exportPatientsToCSV} className="btn-primary" style={{ backgroundColor: '#00c6a7' }}>
            📊 Export All Data
          </button>
        </div>
        
        <ul className="data-list">
            {patients.map((p) => (
                <li key={p.id}>
                    {editingPatientId === p.id ? (
                        <EditPatientForm
                            patient={p}
                            onCancel={() => setEditingPatientId(null)}
                            onSave={handleSaveEdit}
                        />
                    ) : (
                        <>
                            <Link to={`/patient/${p.id}`} className="patient-link">
                                <strong>{p.name}</strong> ({p.age})
                            </Link>
                            <div className="btn-action-group">
                                <button onClick={() => setEditingPatientId(p.id)} className="btn-primary">Edit</button>
                                <button onClick={() => handleDelete(p.id)} className="btn-danger">Delete</button>
                            </div>
                        </>
                    )}
                </li>
            ))}
        </ul>
        
        <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '20px' }}>
          <button 
              className="btn-primary"
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(prev => prev - 1)}
          >
              Înapoi
          </button>
          <span style={{ fontWeight: 'bold' }}> Pagina {currentPage} din {totalPages} </span>
          <button 
              className="btn-primary"
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(prev => prev + 1)}
          >
              Înainte
          </button>
        </div>
      </section>
    </>
  );
}

export default PatientsTab;
