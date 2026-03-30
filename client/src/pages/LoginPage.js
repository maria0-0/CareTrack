import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import './LoginPage.css';
import { Link } from 'react-router-dom';

import API_URL from '../apiConfig';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');


  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const handleLogin = async (e) => {
    e.preventDefault();
  
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
  
    setError('');
  
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
  
      const data = await response.json();
      if (response.ok && data.success) {
        
        const userToSave = {
          ...data.user,
          token: data.token
      };
      login(userToSave);
        navigate('/dashboard');
      }
       else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Server error: ' + err.message);
    }
  };
  

  return (
    <div className="login-container">
      <h2>CareTrack Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Log In</button>
      </form>
      <p>
  Don't have an account? <Link to="/signup">Sign up</Link>
</p>
<p style={{ fontSize: '0.9em', marginTop: '10px' }}>
    <Link to="/forgot-password">Forgot Password?</Link>
</p>
    </div>
  );
}

export default LoginPage;
