'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import IntranetShell from '@/components/IntranetShell';
import { useAuth } from '@/lib/AuthContext';
import { COLORS } from '@/theme';

export default function Accueil() {
  const router = useRouter();
  const { loading, utilisateur, doit_changer_mdp } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!utilisateur) { router.replace('/login'); return; }
    if (doit_changer_mdp) router.replace('/changer-mot-de-passe');
  }, [loading, utilisateur, doit_changer_mdp, router]);

  if (loading || !utilisateur || doit_changer_mdp) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <IntranetShell>
      <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.blue }}>
        Bienvenue, {utilisateur.nom_complet}
      </Typography>
      <Typography sx={{ color: COLORS.muted, mt: 1 }}>
        {utilisateur.fonction || 'Agent'}
        {utilisateur.direction ? ` · ${utilisateur.direction.nom}` : ''}
      </Typography>

      <Paper elevation={0} sx={{ mt: 4, p: { xs: 3, md: 4 }, border: `1px solid ${COLORS.border}`, borderRadius: 3, maxWidth: 720 }}>
        <Typography sx={{ color: COLORS.ink, lineHeight: 1.8 }}>
          Vous êtes connecté à l'espace intranet du Ministère de l'Économie et des Finances.
          Utilisez le menu à gauche pour accéder aux modules disponibles selon vos autorisations.
        </Typography>
      </Paper>
    </IntranetShell>
  );
}
