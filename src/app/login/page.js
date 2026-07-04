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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
        background: 'radial-gradient(1200px 600px at 50% -10%, #dbe7f5 0%, #EEF1F5 55%)',
      }}
    >
      <Card
        component="form"
        onSubmit={onSubmit}
        elevation={0}
        sx={{
          width: '100%', maxWidth: 430,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 4,
          boxShadow: '0 24px 60px rgba(0,40,80,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* Bandeau de marque */}
        <Box
          sx={{
            position: 'relative',
            background: 'linear-gradient(105deg, #002B55 0%, #004080 60%, #0a5ca8 100%)',
            color: '#fff', textAlign: 'center',
            pt: 3.5, pb: 3, px: 3,
          }}
        >
          <Box
            component="img" src="/armoiries-niger.png" alt="Armoiries du Niger"
            sx={{ height: 82, width: 'auto', mx: 'auto', mb: 1.5, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.35))' }}
          />
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.25, letterSpacing: 0.2 }}>
            MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES
          </Typography>
          <Typography sx={{ color: COLORS.gold, fontWeight: 700, fontSize: '0.8rem', mt: 0.25 }}>
            République du Niger
          </Typography>
          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: TRICOLOR }} />
        </Box>

        {/* Formulaire */}
        <Box sx={{ p: { xs: 3, md: 4 } }}>
          <Typography component="h1" sx={{ fontWeight: 800, color: COLORS.blueDark, fontSize: '1.15rem', mb: 0.3 }}>
            Connexion à l'intranet
          </Typography>
          <Typography sx={{ color: COLORS.muted, fontSize: '0.85rem', mb: 2.5 }}>
            Identifiez-vous avec votre matricule.
          </Typography>

          {erreur && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {erreur}
            </Alert>
          )}

          <TextField
            label="Matricule"
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            fullWidth required autoFocus autoComplete="username"
            sx={{ mb: 2 }}
          />

          <TextField
            label="Mot de passe"
            type={voir ? 'text' : 'password'}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            fullWidth required autoComplete="current-password"
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
            type="submit" variant="contained" fullWidth size="large"
            disabled={chargement}
            startIcon={<LoginIcon />}
            sx={{ backgroundColor: COLORS.blue, fontWeight: 700, py: 1.25,
              boxShadow: '0 10px 22px rgba(0,64,128,0.30)',
              '&:hover': { backgroundColor: COLORS.blueHover } }}
          >
            {chargement ? 'Connexion…' : 'Se connecter'}
          </Button>

          <Typography sx={{ color: COLORS.muted, fontSize: '0.76rem', textAlign: 'center', mt: 3, lineHeight: 1.6 }}>
            Compte créé par la DSI. En cas de mot de passe oublié,
            contactez la DSI (poste XXXX).
          </Typography>
        </Box>
      </Card>
    </Box>
  );
}
