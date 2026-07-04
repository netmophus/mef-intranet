'use client';

import { useState } from 'react';
import {
  Box, Card, TextField, Button, Typography, InputAdornment, IconButton, Alert,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LoginIcon from '@mui/icons-material/Login';
import { apiPost } from '@/lib/api';
import { COLORS, TRICOLOR } from '@/theme';

export default function LoginPage() {
  const [matricule, setMatricule] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [voir, setVoir] = useState(false);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErreur('');
    setChargement(true);
    try {
      const data = await apiPost('/api/v1/auth/login/', {
        matricule: matricule.trim(),
        mot_de_passe: motDePasse,
      });
      // Vraie navigation : le AuthProvider se remonte et relit /me/ avec le cookie.
      window.location.href = data.doit_changer_mdp ? '/changer-mot-de-passe' : '/';
    } catch (err) {
      setErreur(
        err.status === 401
          ? 'Matricule ou mot de passe incorrect.'
          : "Une erreur est survenue. Veuillez réessayer."
      );
      setChargement(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: COLORS.bg }}>
      {/* Filet tricolore */}
      <Box sx={{ height: 5, background: TRICOLOR }} />

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Card
          component="form"
          onSubmit={onSubmit}
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 420,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            boxShadow: '0 18px 44px rgba(0,0,0,0.10)',
            p: { xs: 3, md: 4 },
          }}
        >
          {/* Identité */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              component="img"
              src="/armoiries-niger.png"
              alt="Armoiries du Niger"
              sx={{ width: 76, height: 'auto', mx: 'auto', mb: 1.5 }}
            />
            <Typography sx={{ fontWeight: 800, color: COLORS.blue, fontSize: '1.1rem', lineHeight: 1.2 }}>
              MINISTÈRE DES FINANCES
            </Typography>
            <Typography sx={{ color: COLORS.goldDark, fontWeight: 700, fontSize: '0.82rem' }}>
              République du Niger
            </Typography>
            <Typography sx={{ color: COLORS.muted, fontWeight: 600, fontSize: '0.9rem', mt: 1 }}>
              Intranet
            </Typography>
          </Box>

          {erreur && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {erreur}
            </Alert>
          )}

          <TextField
            label="Matricule"
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            fullWidth
            required
            autoFocus
            autoComplete="username"
            sx={{ mb: 2 }}
          />

          <TextField
            label="Mot de passe"
            type={voir ? 'text' : 'password'}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            fullWidth
            required
            autoComplete="current-password"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setVoir((v) => !v)} edge="end" aria-label="Afficher le mot de passe">
                      {voir ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={chargement}
            startIcon={<LoginIcon />}
            sx={{ backgroundColor: COLORS.blue, fontWeight: 700, py: 1.2, '&:hover': { backgroundColor: COLORS.blueHover } }}
          >
            {chargement ? 'Connexion…' : 'Se connecter'}
          </Button>

          <Typography sx={{ color: COLORS.muted, fontSize: '0.76rem', textAlign: 'center', mt: 3, lineHeight: 1.6 }}>
            Compte créé par la DSI. En cas de mot de passe oublié,
            contactez la DSI (poste XXXX).
          </Typography>
        </Card>
      </Box>
    </Box>
  );
}
