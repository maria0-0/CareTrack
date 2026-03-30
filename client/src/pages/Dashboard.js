import React, { useEffect, useState, useContext, useCallback } from 'react';
import './Dashboard.css';
import { AuthContext } from '../AuthContext';
import { useNavigate, Link } from 'react-router-dom';

import OverviewTab from '../components/Dashboard/OverviewTab';
import PatientsTab from '../components/Dashboard/PatientsTab';
import AppointmentsTab from '../components/Dashboard/AppointmentsTab';
import SchedulerModal from '../components/Dashboard/SchedulerModal';
import AuditTab from '../components/Dashboard/AuditTab';
import API_URL from '../apiConfig';

function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [totalStats, setTotalStats] = useState(0);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentTab, setCurrentTab] = useState('dashboard');
  
  // Appointment Related State
  const [appointmentSearchTerm, setAppointmentSearchTerm] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(null);
  const [appointmentReason, setAppointmentReason] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [unavailableTimes, setUnavailableTimes] = useState([]);
  const [bookedDates, setBookedDates] = useState({});
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [currentAppointmentToEdit, setCurrentAppointmentToEdit] = useState(null);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/patients?page=${currentPage}&search=${searchTerm}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPatients(data.patients);
        setTotalStats(data.totalPatients); 
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      setError('Failed to fetch patients.');
    }
  }, [user.token, currentPage, searchTerm]);

  const processBookedDates = (appts) => {
    const datesMap = {};
    appts.forEach(appt => {
        const dateObj = new Date(appt.date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`; 
        
        if (!datesMap[dateKey]) {
            datesMap[dateKey] = [];
        }
        datesMap[dateKey].push(appt.Patient?.name || 'Unknown');
    });
    setBookedDates(datesMap);
  };

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/appointments`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAppointments(data.appointments);
        processBookedDates(data.appointments);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    }
  }, [user.token]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/profile`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await res.json();
        if (data.success) setWelcomeMessage(data.message);
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };

    fetchProfile();
    fetchAppointments();
  }, [user, fetchAppointments]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients, currentPage]);

  useEffect(() => {
    setCurrentPage(1); 
  }, [searchTerm]);

  const checkAvailability = async (date) => {
    if (!user || !user.token) return;
    const localDateString = date.toLocaleDateString('en-CA').split('/').join('-'); 
    setCheckingAvailability(true);
    setIsAvailable(true); 
    
    try {
      const res = await fetch(`${API_URL}/appointments/day`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
          body: JSON.stringify({ date: localDateString }), 
      });
      const data = await res.json();
      if (data.success) {
          const bookedSlots = data.appointments.map(appt => ({
              time: new Date(appt.date),
              patient: appt.Patient ? appt.Patient.name : "Unknown",
              reason: appt.reason
          }));
          setUnavailableTimes(bookedSlots);
          const normalize = (d) => {
              const x = new Date(d);
              x.setSeconds(0, 0);
              return x.getTime(); 
          };
          const selectedNorm = normalize(date);
          const taken = bookedSlots.some(slot => normalize(slot.time) === selectedNorm);
          setIsAvailable(!taken);
      } else {
          setUnavailableTimes([]);
          setIsAvailable(true);
      }
    } catch (err) {
        console.error('Error checking availability:', err);
        setUnavailableTimes([]);
        setIsAvailable(true);
    } finally {
        setCheckingAvailability(false);
    }
  };

  useEffect(() => {
    if (selectedDay) {
        checkAvailability(selectedDay); 
    }
  }, [selectedDay, user.token]);

  const handleAddAppointment = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !appointmentDate || !appointmentReason) {
      setError('All fields are required');
      return;
    }
    if (!isAvailable) {
      setError("The selected time slot is no longer available.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({
          patientId: selectedPatientId,
          date: appointmentDate,
          reason: appointmentReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAppointments([...appointments, data.appointment]);
        setAppointmentDate(null);
        setAppointmentReason('');
        setSelectedPatientId('');
        setIsAvailable(true);
        fetchAppointments(); 
      } else {
        setError(data.message || 'Failed to add appointment');
      }
    } catch (err) {
      setError('Server error');
    }
  };

  const handleReschedule = async (newDate) => {
    if (!currentAppointmentToEdit || !newDate) return;
    try {
      const res = await fetch(`${API_URL}/appointments/${currentAppointmentToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
          body: JSON.stringify({ 
              date: newDate, 
              patientId: currentAppointmentToEdit.patientId,
              reason: currentAppointmentToEdit.reason,
              doctorId: currentAppointmentToEdit.doctorId
            }),
      });
      if (res.ok) {
          alert('Appointment successfully rescheduled!');
          setShowSchedulerModal(false);
          setCurrentAppointmentToEdit(null); 
          await fetchAppointments();
      } else {
          const data = await res.json();
          alert(data.message || 'Rescheduling failed.');
      }
    } catch (err) {
        alert('Server error during reschedule.');
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (!user || !user.token) return;
    if (!window.confirm('Are you sure you want to delete this appointment?')) return; 
    try {
      const res = await fetch(`${API_URL}/appointments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAppointments(appointments.filter((a) => a.id !== id));
      } else {
        alert(data.message || 'Failed to delete appointment');
      }
    } catch (err) {
      alert('Server error');
    }
  };

  const handleDeleteAccount = async () => {
    const firstWarning = window.confirm(
        "🚨 ATENȚIE MAXIMĂ!\n\nAceastă acțiune va șterge DEFINITIV contul tău și TOȚI pacienții salvați."
    );
    if (!firstWarning) return;
    const finalConfirmation = window.prompt("Pentru a confirma ștergerea DEFINITIVĂ, scrie 'STERGE TOT' în căsuța de mai jos:");
    if (finalConfirmation !== "STERGE TOT") {
        alert("Cod incorect. Ștergerea a fost anulată.");
        return;
    }
    try {
        const res = await fetch(`${API_URL}/account`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${user.token}` },
        });
        if (res.ok) {
            alert("Toate datele au fost șterse cu succes.");
            logout();
            navigate('/login');
        }
    } catch (err) {
        alert("Eroare la comunicarea cu serverul.");
    }
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDay);
    newDate.setMonth(newDate.getMonth() + direction);
    newDate.setDate(1); 
    setSelectedDay(newDate);
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
          <h1>CareTrack</h1>
          <button className={currentTab === 'dashboard' ? 'active' : ''} onClick={() => setCurrentTab('dashboard')}>Dashboard</button>
          <button className={currentTab === 'patients' ? 'active' : ''} onClick={() => setCurrentTab('patients')}>Patients</button>
          <button className={currentTab === 'appointments' ? 'active' : ''} onClick={() => setCurrentTab('appointments')}>Schedule</button>
          {user && user.role === 'admin' && (
            <button className={currentTab === 'audit' ? 'active' : ''} onClick={() => setCurrentTab('audit')}>Audit History</button>
          )}    
          {user && user.role === 'admin' && (
            <Link to="/staff" className="nav-link">
              <button className={currentTab === 'staff' ? 'active' : ''} onClick={() => setCurrentTab('staff')}>Staff Management</button>
            </Link>
          )}
          <Link to="/templates" className="nav-link">
            <button className={currentTab === 'templates' ? 'active' : ''} onClick={() => setCurrentTab('templates')}>Manage Templates</button>
          </Link>
          <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button onClick={() => { logout(); navigate('/login'); }} className="btn-danger">Logout</button>
            <button onClick={handleDeleteAccount} className="btn-danger" style={{ marginTop: '10px', backgroundColor: '#8b0000', width: '100%' }}>Delete Account</button>
          </div>
      </aside>

      <main className="main-content">
          <header className="dashboard-header">
              <h2>{welcomeMessage || 'Welcome to CareTrack'}</h2>
          </header>

          {currentTab === 'dashboard' && <OverviewTab appointments={appointments} totalStats={totalStats} user={user} />}
          
          {currentTab === 'patients' && (
            <PatientsTab 
              user={user} 
              patients={patients} 
              setPatients={setPatients} 
              fetchPatients={fetchPatients} 
              searchTerm={searchTerm} 
              setSearchTerm={setSearchTerm} 
              currentPage={currentPage} 
              setCurrentPage={setCurrentPage} 
              totalPages={totalPages} 
            />
          )}

          {currentTab === 'appointments' && (
            <AppointmentsTab 
              user={user}
              patients={patients}
              appointments={appointments}
              handleDeleteAppointment={handleDeleteAppointment}
              handleEditAppointmentClick={(a) => { setCurrentAppointmentToEdit(a); setShowSchedulerModal(true); }}
              appointmentDate={appointmentDate}
              selectedPatientId={selectedPatientId}
              setSelectedPatientId={setSelectedPatientId}
              appointmentReason={appointmentReason}
              setAppointmentReason={setAppointmentReason}
              setIsSchedulingModalOpen={setIsSchedulingModalOpen}
              handleAddAppointment={handleAddAppointment}
              isAvailable={isAvailable}
              checkingAvailability={checkingAvailability}
              error={error}
              appointmentSearchTerm={appointmentSearchTerm}
              setAppointmentSearchTerm={setAppointmentSearchTerm}
            />
          )}

          {currentTab === 'audit' && <AuditTab user={user} />}
      </main>

      {(isSchedulingModalOpen || showSchedulerModal) && (
        <SchedulerModal 
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          user={user}
          setAppointmentDate={setAppointmentDate}
          setIsSchedulingModalOpen={setIsSchedulingModalOpen}
          showSchedulerModal={showSchedulerModal}
          setShowSchedulerModal={setShowSchedulerModal}
          currentAppointmentToEdit={currentAppointmentToEdit}
          setCurrentAppointmentToEdit={setCurrentAppointmentToEdit}
          bookedDates={bookedDates}
          navigateMonth={navigateMonth}
          checkAvailability={checkAvailability}
          unavailableTimes={unavailableTimes}
          checkingAvailability={checkingAvailability}
          handleReschedule={handleReschedule}
        />
      )}
    </div>
  );
}

export default Dashboard;
