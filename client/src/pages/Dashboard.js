import React, { useEffect, useState, useContext, useCallback } from 'react';
import './Dashboard.css';
import { AuthContext } from '../AuthContext';
import EditPatientForm from './EditPatientForm';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {useNavigate} from 'react-router-dom';
import { Link } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { useRef } from 'react';

function Dashboard() {
  const { user } = useContext(AuthContext);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [patients, setPatients] = useState([]);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [birthday, setBirthday] = useState(''); 
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');   
  const [error, setError] = useState('');
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [appointmentSearchTerm, setAppointmentSearchTerm] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [appointmentReason, setAppointmentReason] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editReason, setEditReason] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [unavailableTimes, setUnavailableTimes] = useState([]);
  const [bookedDates, setBookedDates] = useState({});
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [currentAppointmentToEdit, setCurrentAppointmentToEdit] = useState(null);
  const [unavailableSlots, setUnavailableSlots] = useState([]);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [currentTab, setCurrentTab] = useState('dashboard');
  const { logout} = useContext(AuthContext);
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10; // Câți pacienți vrei pe pagină
  const [auditLogs, setAuditLogs] = useState([]);
  const isAdmin = user.role === 'admin';
  const [totalPatientsCount, setTotalPatientsCount] = useState(0); // Nouă stare pentru număr total
  const [totalStats, setTotalStats] = useState(0);
  const sigCanvas = useRef(null);

  const saveDoctorSignature = async () => {
    if (!sigCanvas.current) return;

    if (sigCanvas.current.isEmpty()) {
        return alert("Vă rugăm să semnați înainte de a salva.");
    }

    const canvas = sigCanvas.current.getCanvas(); 
    const signatureData = canvas.toDataURL('image/png');

    try {
        const res = await fetch('http://localhost:4000/profile/signature', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user.token}`,
            },
            body: JSON.stringify({ signature: signatureData }),
        });

        const data = await res.json();
        if (data.success) {
            alert("Semnătura a fost salvată cu succes!");
            const currentUser = JSON.parse(localStorage.getItem('user'));
    if (currentUser) {
        currentUser.signature = signatureData; // signatureData este Base64-ul creat de canvas
        localStorage.setItem('user', JSON.stringify(currentUser));
    }
            window.location.reload();
        } else {
            alert(data.message || "Eroare la salvare.");
        }
    } catch (err) {
        console.error("Signature save error:", err);
        alert("Eroare de rețea la salvarea semnăturii.");
    }
};
  const handleEditClick = (id) => {
    setEditingPatientId(id);
  };
  
  const handleCancelEdit = () => {
    setEditingPatientId(null);
  };
  
  const handleSaveEdit = (updatedPatient) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p))
    );
    setEditingPatientId(null);
  };
  const fetchPatients = useCallback(async () => {
    try {
      // Păstrăm parametrii de paginare actuali
      const res = await fetch(`http://localhost:4000/patients?page=${currentPage}&search=${searchTerm}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      
      if (data.success) {
        setPatients(data.patients); // Ce vedem în tabel (max 10)
        setTotalStats(data.totalPatients); // Numărul TOTAL din toată baza de date
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      setError('Failed to fetch patients.');
    }
  }, [user.token, currentPage, searchTerm]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('http://localhost:4000/profile', {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
        const data = await res.json();
        if (data.success) setWelcomeMessage(data.message);
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };


    const fetchAppointments = async () => {
      try {
        const res = await fetch('http://localhost:4000/appointments', {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
        const data = await res.json();
        if (data.success) setAppointments(data.appointments);
      } catch (err) {
        console.error('Error fetching appointments:', err);
      }
    };
    
    
    fetchAppointments();
    fetchProfile();
    
  }, [user]);

  const handleAddPatient = async (e) => {
    e.preventDefault();
  
    if (!name || !age || !birthday || !phone || !email) {
      setError('Please enter name and age, birthday, phone, and email');
      return;
    }
  
    setError('');
    console.log('Sending:', { name, age: Number(age) });
  
    try {
      const res = await fetch('http://localhost:4000/patients', {
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
        await fetchPatients(); // ✅ refresh list from DB
      } else {
        setError(data.message || 'Failed to add patient');
      }
    } catch (err) {
      setError('Server error: ' + err.message);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients, currentPage]);

  useEffect(() => {
    setCurrentPage(1); // Resetăm la prima pagină când utilizatorul caută ceva nou
}, [searchTerm]);
  
  const handleDelete = async (id) => {
    if (!user || !user.token) {
      alert("Authentication failed. Please log in again.");
      return; 
  }
    if (!window.confirm('WARNING: Are you sure you want to permanently delete this patient and all their associated records (appointments, notes, files)?')) {
      return; 
  }
    try {
      const res = await fetch(`http://localhost:4000/patients/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
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
  const fetchUnavailableSlots = useCallback(async () => {
    try {
        const res = await fetch('http://localhost:4000/appointments/unavailable', {
            headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await res.json();
        if (data.success) {
            setUnavailableSlots(data.slots);
        }
    } catch (err) {
        console.error('Failed to fetch unavailable slots:', err);
    }
}, [user.token]);
useEffect(() => {
       fetchUnavailableSlots(); 
   }, [fetchUnavailableSlots]);
  
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
      const res = await fetch('http://localhost:4000/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          patientId: selectedPatientId,
          date: appointmentDate,
          reason: appointmentReason,
        }),
      });
  
      const data = await res.json();
      if (data.success) {
        setAppointments([...appointments, data.appointment]);
        setAppointmentDate('');
        setAppointmentReason('');
        const patientName = patients.find(p => p.id === Number(selectedPatientId))?.name || 'Unknown';
        setSelectedPatientId('');
      
        // Update unavailableTimes immediately
        setUnavailableTimes((prev) => [
          ...prev,
          {
            time: new Date(data.appointment.date),
            patient: data.appointment.Patient?.name || 'Unknown',
          },
        ]);
      
        setIsAvailable(true);
      } else {
        setError(data.message || 'Failed to add appointment');
      }
    } catch (err) {
      console.error('Appointment error:', err);
      setError('Server error');
    }
    
  };

  const handleDeleteAccount = async () => {
    // Mesaj de avertizare stilizat
    const firstWarning = window.confirm(
        "🚨 ATENȚIE MAXIMĂ!\n\nAceastă acțiune va șterge DEFINITIV contul tău și TOȚI pacienții salvați. Pentru siguranță, vom descărca automat o arhivă cu datele tale înainte de ștergere."
    );

    if (!firstWarning) return;

    // 1. DESCĂRCARE AUTOMATĂ BACKUP
    // Folosim funcția de export pe care o ai deja
    try {
        exportPatientsToCSV();
        alert("💾 Backup-ul a fost generat. Te rugăm să verifici folderul 'Downloads' înainte de a continua.");
    } catch (err) {
        alert("Eroare la generarea backup-ului. Ștergerea a fost oprită pentru a preveni pierderea datelor.");
        return;
    }

    // 2. CONFIRMARE FINALĂ
    const finalConfirmation = window.prompt(
        "Pentru a confirma ștergerea DEFINITIVĂ, scrie 'STERGE TOT' în căsuța de mai jos:"
    );

    if (finalConfirmation !== "STERGE TOT") {
        alert("Cod incorect. Ștergerea a fost anulată.");
        return;
    }

    // 3. APELUL CĂTRE BACKEND
    try {
        const res = await fetch('http://localhost:4000/account', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${user.token}` },
        });

        if (res.ok) {
            alert("Toate datele au fost șterse cu succes. La revedere!");
            logout();
            navigate('/login');
        }
    } catch (err) {
        alert("Eroare la comunicarea cu serverul.");
    }
};

const formatLocalDatetime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};


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

const generateTimeSlots = (day) => {
  if (!day) return [];
  
  const slots = [];
  const start = new Date(day);
  start.setHours(8, 0, 0, 0); 
  const end = new Date(day);
  end.setHours(22, 0, 0, 0); 

  let current = start;

  while (current <= end) {
      slots.push(new Date(current));
      current.setMinutes(current.getMinutes() + 30);
  }
  return slots;
};

useEffect(() => {
  fetchAppointments();
}, [user]); // Assuming fetchAppointments is called here


const generateDayPickerDates = (currentDay) => {
  const dates = [];
  const date = new Date(currentDay);
  date.setDate(date.getDate() - 7); // Start 7 days before the current view

  for (let i = 0; i < 40; i++) { // Show 40 days total
      dates.push(new Date(date));
      date.setDate(date.getDate() + 1);
  }
  return dates;
};


const exportPatientsToCSV = () => {
  if (patients.length === 0) {
      alert("No patient data to export.");
      return;
  }

  // 1. Define CSV Headers
  const headers = ['ID', 'Name', 'Age', 'Birthday', 'Phone', 'Email', 'Created At'];
  
  // 2. Map patient objects to CSV rows
  const csvRows = patients.map(patient => [
      patient.id,
      // Wrap names in quotes in case they contain commas
      `"${patient.name}"`, 
      patient.age,
      // Format date for better readability (YYYY-MM-DD)
      patient.birthday ? new Date(patient.birthday).toLocaleDateString('en-CA') : 'N/A', 
      `"${patient.phone || 'N/A'}"`,
      `"${patient.email || 'N/A'}"`,
      // Format creation date
      new Date(patient.createdAt).toLocaleDateString(),
  ].join(','));

  // 3. Combine headers and rows
  const csvContent = [
      headers.join(','),
      ...csvRows
  ].join('\n');

  // 4. Trigger Download in the Browser
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  // Set file name and URL
  link.href = URL.createObjectURL(blob);
  link.download = `caretrack_patients_${new Date().toISOString().slice(0, 10)}.csv`;
  
  // Click the link to start the download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  alert(`Successfully exported ${patients.length} patients to CSV.`);
};
const isSlotUnavailable = (date) => {
  return unavailableTimes.some(
    (slot) => slot.time.getTime() === date.getTime()
  );
};

const isPastTime = (date) => date < new Date();
const navigateMonth = (direction) => {
  const newDate = new Date(selectedDay);
  
  // Calculate the new month
  newDate.setMonth(newDate.getMonth() + direction);
  
  // Reset the day to the 1st of the new month to stabilize the view
  newDate.setDate(1); 

  setSelectedDay(newDate);
};

const checkAvailability = async (date) => {
  if (!user || !user.token) return;
  
  const localDateString = date.toLocaleDateString('en-CA').split('/').join('-'); 

  setCheckingAvailability(true);
  setIsAvailable(true); // Assume available until conflict is found
  
  try {
    const res = await fetch('http://localhost:4000/appointments/day', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
        },
        // Use local date string to fetch correct day's appointments
        body: JSON.stringify({ date: localDateString }), 
    });

    const data = await res.json();
    if (data.success) {
        const bookedSlots = data.appointments.map(appt => ({
            time: new Date(appt.date),
            patient: appt.Patient ? appt.Patient.name : "Unknown"
        }));

        setUnavailableTimes(bookedSlots);

        // Check if the specific time selected is already taken
        const normalize = (d) => {
            const x = new Date(d);
            x.setSeconds(0, 0);
            return x.getTime(); // Use getTime() for comparison
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
}, [selectedDay, user]);

const DayViewLoader = ({ 
  selectedDay, 
  user, 
  setAppointmentDate, 
  setIsSchedulingModalOpen, 
  checkAvailability, 
  unavailableTimes, 
  loading,
  currentAppointmentToEdit, 
  handleReschedule,
}) => {    

  const isSlotBooked = (slotTime) => {
      return unavailableTimes.find(appt => appt.time.getTime() === slotTime.getTime());
  };

  const slots = generateTimeSlots(selectedDay);

  if (loading) {
      return <p>Loading schedule...</p>;
  }

  return (
      <div className="day-schedule-grid">
          {slots.map((slot, index) => {
              const bookedSlot = isSlotBooked(slot);
              const isPast = slot < new Date();
              
              const className = bookedSlot 
                  ? 'slot-booked' 
                  : isPast 
                      ? 'slot-past' 
                      : 'slot-available';

              return (
                  <div 
                      key={index} 
                      className={`time-slot ${className}`}
                      onClick={() => {
                        if (currentAppointmentToEdit) {
                          handleReschedule(slot.toISOString()); 
                      } else {
                          setAppointmentDate(slot); 
                          setIsSchedulingModalOpen(false);
                      }
                      }}
                  >
                      {/* Time display */}
                      <span className="slot-time">
                          {slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {/* Patient info on booked slots */}
                      {bookedSlot && (
                          <div className="booked-info">
                              <span>{bookedSlot.patient || 'Unknown'}</span>
                              <span className="reason-popup">
                                  Reason: {bookedSlot.reason}
                              </span>
                          </div>
                      )}
                  </div>
              );
          })}
      </div>
  );
};

  const handleDeleteAppointment = async (id) => {
    if (!user || !user.token) {
      alert("Authentication failed. Please log in again.");
      return; 
  }
    if (!window.confirm('Are you sure you want to delete this appointment?')) {
      return; 
  }
    try {
      const res = await fetch(`http://localhost:4000/appointments/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
  
      const data = await res.json();
      if (data.success) {
        setAppointments(appointments.filter((a) => a.id !== id));
      } else {
        alert(data.message || 'Failed to delete appointment');
      }
    } catch (err) {
      console.error('Delete appointment error:', err);
      alert('Server error');
    }
  };

const handleReschedule = async (newDate) => {
  if (!currentAppointmentToEdit || !newDate) return;
  
  const appointmentId = currentAppointmentToEdit.id;
  
  // Send the new date to your existing PUT route (e.g., /appointments/123)
  try {
      const res = await fetch(`http://localhost:4000/appointments/${appointmentId}`, {
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
const handleEditAppointmentClick = (appointment) => {
  setCurrentAppointmentToEdit(appointment);
  setShowSchedulerModal(true); 
  fetchUnavailableSlots(); 
};
  const saveEdit = async (appointmentId) => {
    try {
      const updatedAppointment = {
        date: new Date(editDate).toISOString(),
        reason: editReason,
      };
  
      const res = await fetch(`http://localhost:4000/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(updatedAppointment),
      });
  
      const data = await res.json();
  
      if (data.success) {
        // Update the appointment in local state
        setAppointments(appointments.map(a => 
          a.id === appointmentId ? data.appointment : a
        ));
        setEditingAppointmentId(null);
      } else {
        alert(data.message || 'Failed to update appointment');
      }
    } catch (err) {
      console.error('Error updating appointment:', err);
      alert('Server error');
    }
  };
  
 
  
  const fetchAppointments = async () => {
    // ⭐️ ADD THE FETCH CALL HERE ⭐️
    try {
      const res = await fetch('http://localhost:4000/appointments', {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
  
      // The rest of your logic now works because 'res' is defined above
      const data = await res.json();
  
      if (data.success) {
        setAppointments(data.appointments);
        processBookedDates(data.appointments); 
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:4000/audit-logs', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  }, [user.token]);

  useEffect(() => {
    if (currentTab === 'audit') {
      fetchAuditLogs();
    }
  }, [currentTab, fetchAuditLogs]);
  
  return (
    <div className="dashboard-container">
      {/* Sidebar: Simplified for cleaner tab management */}
      <aside className="sidebar">
          <h1>CareTrack</h1>
          
          {/* Main Navigation Buttons */}
          <button
              className={currentTab === 'dashboard' ? 'active' : ''}
              onClick={() => setCurrentTab('dashboard')}
          >
              Dashboard
          </button>
          <button
              className={currentTab === 'patients' ? 'active' : ''}
              onClick={() => setCurrentTab('patients')}
          >
              Patients
          </button>
          <button
              className={currentTab === 'appointments' ? 'active' : ''}
              onClick={() => setCurrentTab('appointments')}
          >
              Schedule
          </button>
          {user && user.role === 'admin' && (
    <button 
        className={currentTab === 'audit' ? 'active' : ''} 
        onClick={() => setCurrentTab('audit')}
    >
        Audit History
    </button>
)}    
{user && user.role === 'admin' && (
        <Link to="/staff" className="nav-link">
            <button className={currentTab === 'staff' ? 'active' : ''} onClick={() => setCurrentTab('staff')}>
                Staff Management
            </button>
        </Link>
    )}
     <Link to="/templates" className="nav-link">
    <button className={currentTab === 'templates' ? 'active' : ''} onClick={() => setCurrentTab('templates')}>
        Manage Templates
    </button>
</Link>
         {/* <Link to="/audit" className="nav-link" style={{ marginBottom: '10px' }}>
        <button className="btn-secondary" style={{ width: '100%', backgroundColor: '#4a007a' }}> 
            {/* Using a distinct color for security feature  View Audit Log </button></Link>*/}
          <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <button
                  onClick={() => {
                      logout(); 
                      navigate('/login');
                  }}
                  className="btn-danger" // Use a danger/logout style
              >
                  Logout
              </button>
              <button
        onClick={handleDeleteAccount}
        className="btn-danger" 
        style={{ marginTop: '10px', backgroundColor: '#8b0000', width: '100%' }} // Darker red for severe action
    >
        Delete Account
    </button>
          </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
          <header className="dashboard-header">
              <h2>{welcomeMessage || 'Welcome to CareTrack'}</h2>
             
                        </header>

          {/* Tab Content Display */}

          {/* -------------------- 1. DASHBOARD/OVERVIEW TAB -------------------- */}
          {currentTab === 'dashboard' && (
              <>
                  <section className="dashboard-section">
                      <h3>Today’s Schedule</h3>
                      <ul className="data-list">
                          {appointments
                              .filter(
                                  (a) =>
                                      new Date(a.date) >= new Date() &&
                                      new Date(a.date).toDateString() === new Date().toDateString()
                              )
                              .sort((a, b) => new Date(a.date) - new Date(b.date))
                              .map((a) => (
                                  <li key={a.id} className="appointment-item">
                                      {new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {a.Patient?.name} – {a.reason}
                                      <span style={{ fontWeight: 'normal', color: '#007bff' }}>{a.status}</span>
                                  </li>
                              ))}
                      </ul>
                  </section>
                  
                  {/* You can add more overview cards here */}
                  <section className="dashboard-section">
                      <h3>Quick Stats</h3>
                      <div className="stat-card">
  <h3>Pacienți Activi</h3>
  <p className="stat-number">{totalStats}</p> 
</div>
                      <p>Upcoming Appointments: {appointments.filter(a => new Date(a.date) >= new Date()).length}</p>
                  </section>
                  <section className="dashboard-section">
    <h3>✒️ Semnătura Mea Profesională</h3>
    <p style={{ fontSize: '0.9rem', color: '#666' }}>Această semnătură va fi aplicată automat pe toate documentele tale.</p>
    <div style={{ border: '1px solid #ddd', background: '#fff', width: '300px', borderRadius: '8px' }}>
        <SignatureCanvas 
            ref={sigCanvas}
            penColor="black"
            canvasProps={{ width: 300, height: 100, className: 'sigCanvas' }}
        />
    </div>
    <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
        <button onClick={saveDoctorSignature} className="btn-primary">Salvează Semnătura</button>
        <button onClick={() => sigCanvas.current.clear()} className="btn-secondary">Șterge</button>
        
    
    </div>
    {user && user.signature && (
    <div style={{ marginTop: '20px' }}>
        <p><strong>Semnătura ta salvată:</strong></p>
        <img 
            src={user.signature} 
            alt="Preview Semnatura" 
            style={{ border: '1px solid #00c6a7', borderRadius: '4px', maxWidth: '200px' }} 
        />
    </div>
)}
    
</section>
              </>
          )}

          {/* -------------------- 2. PATIENTS TAB -------------------- */}
          {currentTab === 'patients' && (
              <>
              {/* Add New Patient Form */}
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
                  {/* Patient List */}
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
                          {patients
                         
                          .map((p) => (
                              <li key={p.id}>
                                  {editingPatientId === p.id ? (
                                      <EditPatientForm
                                          patient={p}
                                          onCancel={handleCancelEdit}
                                          onSave={handleSaveEdit}
                                      />
                                  ) : (
                                      <>
                                          <Link to={`/patient/${p.id}`} className="patient-link">
                                              <strong>{p.name}</strong> ({p.age})
                                          </Link>
                                          <div className="btn-action-group">
                                              <button onClick={() => handleEditClick(p.id)} className="btn-primary">Edit</button>
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
          )}

          {/* -------------------- 3. SCHEDULE/APPOINTMENTS TAB -------------------- */}
          {currentTab === 'appointments' && (
              <>
                  <section className="dashboard-section">
    <h3>Schedule New Appointment</h3>
    <form onSubmit={handleAddAppointment} className="form-row">
    <input
        type="text"
        placeholder="Search patient by name..."
        value={appointmentSearchTerm}
        onChange={(e) => setAppointmentSearchTerm(e.target.value)}
        style={{ padding: '8px', marginRight: '10px', width: '200px' }}
    />
    
    {/* ⭐️ NEW: Filtered Patient Selector ⭐️ */}
    <select
        value={selectedPatientId}
        onChange={(e) => setSelectedPatientId(e.target.value)}
        style={{ marginRight: '10px' }}
    >
        <option value="">Select Patient</option>
        {patients
            // Filter the patient list based on the search term
            .filter(p => {
                if (!appointmentSearchTerm) return true;
                return p.name.toLowerCase().includes(appointmentSearchTerm.toLowerCase());
            })
            // Map the filtered list to options
            .map((p) => (
                <option key={p.id} value={p.id}>
                    {p.name}
                </option>
            ))}
    </select>
       

        {/* 2. Scheduler Trigger (Horizontal alignment) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            
            {/* Label Text */}
            <p style={{ margin: '0', fontWeight: '500', flexShrink: 0 }}>
                Selected Date & Time:
            </p>
            
            {/* Display of Selected Value */}
            <p style={{ margin: '0', fontSize: '1rem', whiteSpace: 'nowrap', flexGrow: 1 }}>
                {appointmentDate ? 
                    <strong>{appointmentDate.toLocaleString()}</strong> : 
                    <span style={{ color: '#888' }}>Click to select</span>
                }
            </p>
            
            {/* Button to Open Modal */}
            <button 
                type="button" 
                onClick={() => setIsSchedulingModalOpen(true)} 
                className="btn-primary"
                style={{ padding: '8px 15px', flexShrink: 0 }}
            >
                Open Scheduler
            </button>
        </div>

        {/* 3. Appointment Reason Input */}
        <input
            type="text"
            placeholder="Reason for Appointment"
            value={appointmentReason}
            onChange={(e) => setAppointmentReason(e.target.value)}
            style={{ marginBottom: '15px' }} // Added spacing for better flow
        />
        
        {/* 4. Submission Button */}
        <button 
            type="submit" 
            disabled={!isAvailable || checkingAvailability || !appointmentDate || !selectedPatientId}
            className="btn-primary"
            style={{ width: '100%' }}
        >
            {checkingAvailability ? 'Checking...' : 'Add Appointment'}
        </button>
        
        {/* Error/Feedback */}
        {error && <p className="error-text">{error}</p>}
        
    </form> {/* The entire form is now one coherent block */}

  
                      {/* Availability Feedback */}
                      {appointmentDate && !isAvailable && (
                          <p className="error-text">That time is already taken.</p>
                      )}
                      
                      {unavailableTimes.length > 0 && (
                          <div className="unavailable-times">
                              <strong>Unavailable slots:</strong>
                              <ul>
                                  {unavailableTimes.map((slot, index) => (
                                      <li key={index}>
                                          {slot.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — {slot.patient}
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      )}
                  </section>
  

                  <section className="dashboard-section">
                      <h3>Upcoming Appointments</h3>
                      <ul className="data-list">
                          {appointments
                              .filter(a => new Date(a.date) >= new Date())
                              .sort((a, b) => new Date(a.date) - new Date(b.date))
                              .map((a) => (
                                  <li key={a.id}>
                                      <div className="appt-details">
                                          <strong>{a.Patient?.name || 'Unknown patient'}</strong> – 
                                          {new Date(a.date).toLocaleString()} – {a.reason}
                                      </div>
                                      
                                      <div className="btn-action-group">
                                      <button 
                                          onClick={() => handleEditAppointmentClick(a)} 
                                          className="btn-primary" // Use a primary button style for the main action
                                      >
                                          Reschedule
                                      </button>
                                      {/* The simple inline edit form and state (editingAppointmentId) are no longer needed here */}
                                      <button onClick={() => handleDeleteAppointment(a.id)} className="btn-danger">Delete</button>
                                 </div>
                                  </li>
                              ))}
                      </ul>
                  </section>
              </>
          )}
      </main>
      {isSchedulingModalOpen || showSchedulerModal ? (
          <div className="scheduling-modal-overlay">
              <div className="scheduling-modal-content">
                  <div className="modal-header-nav">
                      <div className="month-display">
                          {/* Display context-aware header */}
                          <h3>
                              {currentAppointmentToEdit 
                                  ? `Reschedule: ${currentAppointmentToEdit.Patient?.name || 'Appointment'}`
                                  : 'Schedule New Appointment'}
                          </h3>
                      </div>
                      
                      <div className="nav-buttons">
                          <button onClick={() => navigateMonth(-1)} className="btn-month-nav">&lt; Prev Month</button>
                          <button onClick={() => navigateMonth(1)} className="btn-month-nav">Next Month &gt;</button>
                      </div>
                      
                      {/* Close button now clears ALL modal flags */}
                      <button 
                          onClick={() => {
                              setIsSchedulingModalOpen(false);
                              setShowSchedulerModal(false); // Clear reschedule flag
                              setCurrentAppointmentToEdit(null); // Clear appointment being edited
                          }} 
                          className="modal-close-btn"
                      >
                          &times;
                      </button>
                  </div>

                  {/* Horizontal Day Picker (JSX remains the same) */}
                  <div className="day-picker-container">
                      {generateDayPickerDates(selectedDay).map((date, index) => {
                          const isSelected = date.toDateString() === selectedDay.toDateString();
                          const isBooked = bookedDates[date.toISOString().split('T')[0]];
                          
                          return (
                              <div 
                                  key={index} 
                                  className={`day-picker-item ${isSelected ? 'selected' : ''} ${isBooked ? 'booked' : ''}`}
                                  onClick={() => setSelectedDay(date)}
                              >
                                  <span className="day-name">
                                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                  </span>
                                  <span className="day-num">
                                      {date.getDate()}
                                  </span>
                              </div>
                          );
                      })}
                  </div>
                  
                  {/* TIME AGENDA VIEW - Passing all necessary props */}
                  <div className="agenda-view-container">
                      <DayViewLoader 
                          selectedDay={selectedDay}
                          user={user}
                          checkAvailability={checkAvailability}
                          unavailableTimes={unavailableTimes}
                          loading={checkingAvailability}
                          
                          // ⭐️ RESCHEDULE PROPS ⭐️
                          currentAppointmentToEdit={currentAppointmentToEdit}
                          handleReschedule={handleReschedule} 

                          // ⭐️ NEW APPOINTMENT PROPS ⭐️
                          setAppointmentDate={setAppointmentDate}
                          setIsSchedulingModalOpen={setIsSchedulingModalOpen}
                          
                          // Pass reschedule flag for closing logic inside DayViewLoader if needed
                          setShowSchedulerModal={setShowSchedulerModal} 
                      />
                  </div>
              </div>
          </div>
      ) : null}
      {currentTab === 'audit' && (
  <div className="audit-container">
    <h3>Istoric Securitate</h3>
    <table className="audit-table">
    <thead>
  <tr>
    <th>Dată</th>
    <th>Doctor</th> {/* Coloană nouă */}
    <th>Acțiune</th>
    <th>Detalii</th>
    <th>IP</th>
  </tr>
</thead>
<tbody>

  {auditLogs.map(log => (
   
   <tr key={log.id} className="audit-row">
  <td className="audit-date">{new Date(log.createdAt).toLocaleString()}</td>
  <td className="audit-user">
    {log.User ? `${log.User.firstName} ${log.User.lastName}` : 'Sistem'}
  </td>
  <td className="audit-action">
    {/* Aici aplicăm clasa dinamică pentru culoare doar pe textul acțiunii */}
    <span className={`badge action-${log.action.toLowerCase()}`}>
      {log.action}
    </span>
  </td>
  <td className="audit-details">{log.details}</td>
  <td className="audit-ip"><code>{log.ipAddress}</code></td>
</tr>
    
  ))}

</tbody>
    </table>
  </div>
)}
  </div>
);
}

export default Dashboard;
