import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  // 1. Inițializăm starea DIRECT din localStorage (fără useEffect separat pentru load)
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const login = (userData) => {
    // userData trebuie să fie: { email, token, firstName, lastName, role }
    setUser(userData); 
    localStorage.setItem('user', JSON.stringify(userData));
    // Salvăm și token-ul separat pentru siguranță, așa cum făceai în LoginPage
    localStorage.setItem('token', userData.token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // Putem șterge cel de-al doilea useEffect care făcea removeItem automat
  // deoarece gestionăm asta manual în login și logout.

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}