import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext';
import { useNavigate } from 'react-router-dom'; // Importăm pentru navigare
import './StaffManagementPage.css';

const StaffManagementPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [staff, setStaff] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const response = await fetch('http://localhost:4000/staff', {
                    headers: {
                        'Authorization': `Bearer ${user.token}`
                    }
                });
                const data = await response.json();
                if (data.success) {
                    setStaff(data.users);
                } else {
                    setError(data.message);
                }
            } catch (err) {
                setError('Failed to fetch staff');
            }
        };

        fetchStaff();
    }, [user.token]);

    const handleToggleRole = async (targetUser) => {
        const newRole = targetUser.role === 'admin' ? 'doctor' : 'admin';
        
        if (!window.confirm(`Sigur vrei să schimbi rolul lui ${targetUser.firstName} în ${newRole}?`)) {
            return;
        }
    
        try {
            const response = await fetch(`http://localhost:4000/staff/${targetUser.id}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ role: newRole })
            });
    
            const data = await response.json();
    
            if (data.success) {
                alert('Rol actualizat cu succes!');
                setStaff(prevStaff => prevStaff.map(u => 
                    u.id === targetUser.id ? { ...u, role: newRole } : u
                ));
            } else {
                alert(data.message || 'Eroare la schimbarea rolului.');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            alert('Eroare de rețea.');
        }
    };

    return (
        <div className="staff-page-wrapper">
            <header className="staff-header">
                <div className="header-left">
                    <button onClick={() => navigate('/dashboard')} className="btn-back">
                        ← Dashboard
                    </button>
                    <h1>Echipa Medicală</h1>
                </div>
                <div className="staff-stats">
                    Total Membri: <strong>{staff.length}</strong>
                </div>
            </header>

            {error && <div className="error-banner">{error}</div>}

            <div className="staff-card">
                <table className="staff-table">
                    <thead>
                        <tr>
                            <th>Nume Complet</th>
                            <th>Email Oficial</th>
                            <th>Rol Sistem</th>
                            <th style={{ textAlign: 'center' }}>Acțiuni Gestiune</th>
                        </tr>
                    </thead>
                    <tbody>
                        {staff.map(u => (
                            <tr key={u.id}>
                                <td>
                                    <div className="user-name-cell">
                                        <div className="user-avatar">{u.firstName[0]}{u.lastName[0]}</div>
                                        {u.firstName} {u.lastName}
                                    </div>
                                </td>
                                <td>{u.email}</td>
                                <td>
                                    <span className={`badge role-${u.role}`}>
                                        {u.role.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    {u.id !== user.id ? (
                                        <button 
                                            onClick={() => handleToggleRole(u)}
                                            className={`btn-toggle ${u.role === 'admin' ? 'demote' : 'promote'}`}
                                        >
                                            {u.role === 'admin' ? 'Retrogradează' : 'Fă-l Admin'}
                                        </button>
                                    ) : (
                                        <span className="current-user-tag">Contul tău</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StaffManagementPage;