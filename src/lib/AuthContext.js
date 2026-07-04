'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiGet } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [etat, setEtat] = useState({
    loading: true, utilisateur: null, roles: [], permissions: [], doit_changer_mdp: false,
  });

  const charger = useCallback(async () => {
    try {
      const d = await apiGet('/api/v1/auth/me/');
      const u = d.utilisateur || {};
      setEtat({
        loading: false,
        utilisateur: u,
        roles: u.roles || [],
        permissions: u.permissions || [],
        doit_changer_mdp: d.doit_changer_mdp,
      });
    } catch {
      setEtat({ loading: false, utilisateur: null, roles: [], permissions: [], doit_changer_mdp: false });
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const has = useCallback(
    (perm) => (etat.permissions || []).includes(perm),
    [etat.permissions],
  );

  return (
    <AuthContext.Provider value={{ ...etat, has }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
