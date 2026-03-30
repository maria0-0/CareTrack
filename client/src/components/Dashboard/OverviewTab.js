import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import API_URL from '../../apiConfig';

function OverviewTab({ appointments, totalStats, user }) {
  const sigCanvas = useRef(null);

  const saveDoctorSignature = async () => {
    if (!sigCanvas.current) return;

    if (sigCanvas.current.isEmpty()) {
        return alert("Vă rugăm să semnați înainte de a salva.");
    }

    const canvas = sigCanvas.current.getCanvas(); 
    const signatureData = canvas.toDataURL('image/png');

    try {
        const res = await fetch(`${API_URL}/profile/signature`, {
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
                currentUser.signature = data.signature; // Save the S3 URL instead of Base64
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

  const todayAppointments = appointments
    .filter((a) => new Date(a.date) >= new Date() && new Date(a.date).toDateString() === new Date().toDateString())
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const upcomingAppointmentsCount = appointments.filter(a => new Date(a.date) >= new Date()).length;

  return (
    <>
      <section className="dashboard-section">
        <h3>Today’s Schedule</h3>
        <ul className="data-list">
          {todayAppointments.map((a) => (
            <li key={a.id} className="appointment-item">
              {new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {a.Patient?.name} – {a.reason}
              <span style={{ fontWeight: 'normal', color: '#007bff' }}>{a.status}</span>
            </li>
          ))}
        </ul>
      </section>
      
      <section className="dashboard-section">
        <h3>Quick Stats</h3>
        <div className="stat-card">
          <h3>Pacienți Activi</h3>
          <p className="stat-number">{totalStats}</p> 
        </div>
        <p>Upcoming Appointments: {upcomingAppointmentsCount}</p>
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
  );
}

export default OverviewTab;
