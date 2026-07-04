'use client';

import { Box, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useRouter } from 'next/navigation';
import { COLORS } from '@/theme';

export default function AccesRefuse({ message }) {
  const router = useRouter();
  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', mt: { xs: 6, md: 10 }, textAlign: 'center' }}>
      <LockIcon sx={{ fontSize: 56, color: COLORS.muted, mb: 1.5 }} />
      <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.blue, mb: 1 }}>
        Accès non autorisé
      </Typography>
      <Typography sx={{ color: COLORS.muted, mb: 3 }}>
        {message || "Vous n'avez pas les autorisations nécessaires pour accéder à cette page."}
      </Typography>
      <Button variant="contained" onClick={() => router.replace('/')}
        sx={{ backgroundColor: COLORS.blue, fontWeight: 700, '&:hover': { backgroundColor: COLORS.blueHover } }}>
        Retour à l'accueil
      </Button>
    </Box>
  );
}
