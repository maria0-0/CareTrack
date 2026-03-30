import { useState } from 'react';
import API_URL from '../apiConfig';
function EditPatientForm({ patient, onCancel, onSave }) {
  const [name, setName] = useState(patient.name);
  const [age, setAge] = useState(patient.age);
  const [birthday, setBirthday] = useState(patient.birthday || '');
  const [phone, setPhone] = useState(patient.phone || '');
  const [email, setEmail] = useState(patient.email || '');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !age || !birthday || !phone || !email) {
      setError('Name and age are required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/patients/${patient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, age, birthday, phone, email}),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onSave(data.patient);
      } else {
        setError(data.message || 'Failed to update patient');
      }
    } catch (err) {
      setError('Server error: ' + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        required
      />
      <input
        type="number"
        value={age}
        onChange={(e) => setAge(e.target.value)}
        placeholder="Age"
        required
      />
      <input
        type="date"
        value={birthday}
        onChange={(e) => setBirthday(e.target.value)}
        placeholder="Birthday"
      />
      <input
        type="text"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />

      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit">Save</button>
      <button type="button" onClick={onCancel} style={{ marginLeft: '0.5rem' }}>
        Cancel
      </button>
    </form>
  );
}

export default EditPatientForm;
