import React, { useState } from 'react';

function AppointmentsTab({ 
  user, 
  patients, 
  appointments, 
  handleDeleteAppointment, 
  handleEditAppointmentClick,
  appointmentDate,
  selectedPatientId,
  setSelectedPatientId,
  appointmentReason,
  setAppointmentReason,
  setIsSchedulingModalOpen,
  handleAddAppointment,
  isAvailable,
  checkingAvailability,
  error,
  appointmentSearchTerm,
  setAppointmentSearchTerm
}) {
  return (
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
          
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            style={{ marginRight: '10px' }}
          >
            <option value="">Select Patient</option>
            {patients
              .filter(p => {
                if (!appointmentSearchTerm) return true;
                return p.name.toLowerCase().includes(appointmentSearchTerm.toLowerCase());
              })
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <p style={{ margin: '0', fontWeight: '500', flexShrink: 0 }}>
              Selected Date & Time:
            </p>
            <p style={{ margin: '0', fontSize: '1rem', whiteSpace: 'nowrap', flexGrow: 1 }}>
              {appointmentDate ? 
                <strong>{new Date(appointmentDate).toLocaleString()}</strong> : 
                <span style={{ color: '#888' }}>Click to select</span>
              }
            </p>
            <button 
              type="button" 
              onClick={() => setIsSchedulingModalOpen(true)} 
              className="btn-primary"
              style={{ padding: '8px 15px', flexShrink: 0 }}
            >
              Open Scheduler
            </button>
          </div>

          <input
            type="text"
            placeholder="Reason for Appointment"
            value={appointmentReason}
            onChange={(e) => setAppointmentReason(e.target.value)}
            style={{ marginBottom: '15px' }}
          />
          
          <button 
            type="submit" 
            disabled={!isAvailable || checkingAvailability || !appointmentDate || !selectedPatientId}
            className="btn-primary"
            style={{ width: '100%' }}
          >
            {checkingAvailability ? 'Checking...' : 'Add Appointment'}
          </button>
          
          {error && <p className="error-text">{error}</p>}
        </form>
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
                    className="btn-primary"
                  >
                    Reschedule
                  </button>
                  <button onClick={() => handleDeleteAppointment(a.id)} className="btn-danger">Delete</button>
                </div>
              </li>
            ))}
        </ul>
      </section>
    </>
  );
}

export default AppointmentsTab;
