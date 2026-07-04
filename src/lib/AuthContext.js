'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiGet } from './api';

const AuthContext = createContext(null);

// Dénomination par défaut (repli si l'API n'a pas encore répondu).
export const NOM_MINISTERE_DEFAUT = "Ministère de l'Économie et des Finances";

export function AuthProvider({ children }) {
  const [etat, setEtat] = useState({
    loading: true, utilisateur: null, roles: [], permissions: [], doit_changer_mdp: false,
    nom_ministere: NOM_MINISTERE_DEFAUT,
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
        nom_ministere: d.nom_ministere || NOM_MINISTERE_DEFAUT,
      });
    } catch {
      setEtat({ loading: false, utilisateur: null, roles: [], permissions: [], doit_changer_mdp: false,
        nom_ministere: NOM_MINISTERE_DEFAUT });
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
