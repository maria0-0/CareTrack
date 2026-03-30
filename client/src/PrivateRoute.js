import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';

export default function PrivateRoute({ children }) {
  const { user } = useContext(AuthContext);

  if (!user || !user.token) {
    return <Navigate to="/" replace />;
  }

  return children;
}
