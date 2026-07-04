'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppBar, Toolbar, Box, Typography, Button, Container, CircularProgress, Paper,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { apiGet, apiPost } from '@/lib/api';
import { COLORS, TRICOLOR } from '@/theme';

export default function Accueil() {
  const router = useRouter();
  const [utilisateur, setUtilisateur] = useState(null);

  useEffect(() => {
    let actif = true;
    apiGet('/api/v1/auth/me/')
      .then((data) => {
        if (!actif) return;
        if (data.doit_changer_mdp) {
          router.replace('/changer-mot-de-passe');
          return;
        }
        setUtilisateur(data.utilisateur);
      })
      .catch(() => {
        // 401 : lib/api gère déjà la redirection vers /login.
      });
    return () => { actif = false; };
  }, [router]);

  async function deconnexion() {
    try {
      await apiPost('/api/v1/auth/logout/');
    } catch {
      // on redirige quoi qu'il arrive
    }
    router.replace('/login');
  }

  if (!utilisateur) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: COLORS.bg }}>
      <AppBar position="static" elevation={0} sx={{ backgroundColor: COLORS.blue }}>
        <Toolbar>
          <Box component="img" src="/armoiries-niger.png" alt="" sx={{ height: 40, mr: 1.5 }} />
          <Typography component="div" sx={{ fontWeight: 800, flex: 1, fontSize: { xs: '0.95rem', md: '1.1rem' } }}>
            Intranet — Ministère des Finances
          </Typography>
          <Box sx={{ textAlign: 'right', mr: 2, display: { xs: 'none', sm: 'block' } }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.15 }}>
              {utilisateur.nom_complet}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', opacity: 0.85 }}>
              {utilisateur.direction ? utilisateur.direction.sigle : '—'}
            </Typography>
          </Box>
          <Button onClick={deconnexion} color="inherit" startIcon={<LogoutIcon />} sx={{ fontWeight: 700 }}>
            Se déconnecter
          </Button>
        </Toolbar>
        <Box sx={{ height: 4, background: TRICOLOR }} />
      </AppBar>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.blue }}>
          Bienvenue, {utilisateur.nom_complet}
        </Typography>
        <Typography sx={{ color: COLORS.muted, mt: 1 }}>
          {utilisateur.fonction || 'Agent'}
          {utilisateur.direction ? ` · ${utilisateur.direction.nom}` : ''}
        </Typography>

        <Paper elevation={0} sx={{ mt: 4, p: { xs: 3, md: 4 }, border: `1px solid ${COLORS.border}`, borderRadius: 3 }}>
          <Typography sx={{ color: COLORS.ink, lineHeight: 1.8 }}>
            Vous êtes connecté à l'espace intranet du Ministère de l'Économie et des Finances.
            Les modules (annuaire, demandes, documents internes…) seront ajoutés progressivement.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
