import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css'; 
import API_URL from '../apiConfig';

function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        try {
            const res = await fetch(`${API_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            // Since the backend sends success even if the email isn't found, 
            // we display the general message to the user.
            setMessage(data.message || 'If that email exists, a link has been sent.');
            setEmail('');

        } catch (err) {
            setError('Server error while requesting password reset.');
        }
    };

    return (
        <div className="login-container">
            <h2>Forgot Password</h2>
            <form onSubmit={handleSubmit}>
                <p>Enter your email to receive a reset link:</p>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {message && <p style={{ color: 'green' }}>{message}</p>}
                <button type="submit">Send Reset Link</button>
            </form>
            <p onClick={() => navigate('/login')} style={{ cursor: 'pointer', marginTop: '15px' }}>
                Back to Login
            </p>
        </div>
    );
}

export default ForgotPasswordPage;