import './PatientPage.css';
import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import API_URL from '../apiConfig';

import PatientHeader from '../components/Patient/PatientHeader';
import PatientAgreements from '../components/Patient/PatientAgreements';
import OcrExtractor from '../components/Patient/OcrExtractor';
import MedicalHistory from '../components/Patient/MedicalHistory';
import GeneralNotes from '../components/Patient/GeneralNotes';
import AppointmentsList from '../components/Patient/AppointmentsList';
import PatientFilesList from '../components/Patient/PatientFilesList';

function PatientPage() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState('');

  const fetchPatient = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/patients/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
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
  }, [id, user.token]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!patient) return <p>Loading...</p>;

  return (
    <div className="patient-container">
      <PatientHeader patient={patient} />
      
      <PatientAgreements patient={patient} user={user} onRefresh={fetchPatient} />
      <OcrExtractor patient={patient} user={user} onRefresh={fetchPatient} />

      <div className="content-grid">
        {/* LEFT COLUMN */}
        <div>
          <MedicalHistory patient={patient} user={user} onRefresh={fetchPatient} />
          <GeneralNotes patient={patient} user={user} onRefresh={fetchPatient} />
          <AppointmentsList patient={patient} user={user} onRefresh={fetchPatient} />
        </div>

        {/* RIGHT COLUMN */}
        <div>
          <PatientFilesList patient={patient} user={user} onRefresh={fetchPatient} />
        </div>
      </div>
    </div>
  );
}

export default PatientPage;