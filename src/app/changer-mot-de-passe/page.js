'use client';

import { useState } from 'react';
import { Box, Card, TextField, Button, Typography, Alert } from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import { apiPost, ApiError } from '@/lib/api';
import { COLORS, TRICOLOR } from '@/theme';

const REGLES = [
  'Au moins 8 caractères',
  'Différent d\'un mot de passe trop courant',
  'Ne doit pas ressembler à vos informations personnelles',
  'Ne doit pas être entièrement numérique',
];

export default function ChangerMotDePassePage() {
  const [actuel, setActuel] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);
  const [chargement, setChargement] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErreur('');
    if (nouveau !== confirmation) {
      setErreur('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }
    setChargement(true);
    try {
      await apiPost('/api/v1/auth/changer-mot-de-passe/', {
        mot_de_passe_actuel: actuel,
        nouveau_mot_de_passe: nouveau,
        confirmation,
      });
      setSucces(true);
      // Vraie navigation pour rafraîchir le contexte d'auth (doit_changer_mdp = false).
      setTimeout(() => { window.location.href = '/'; }, 1200);
    } catch (err) {
      let msg = "Une erreur est survenue. Veuillez réessayer.";
      if (err instanceof ApiError && err.data && typeof err.data === 'object') {
        const premier = Object.values(err.data)[0];
        msg = Array.isArray(premier) ? premier[0] : (err.data.detail || msg);
      }
      setErreur(msg);
      setChargement(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: COLORS.bg }}>
      <Box sx={{ height: 5, background: TRICOLOR }} />
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Card
          component="form"
          onSubmit={onSubmit}
          elevation={0}
          sx={{ width: '100%', maxWidth: 460, border: `1px solid ${COLORS.border}`, borderRadius: 3, boxShadow: '0 18px 44px rgba(0,0,0,0.10)', p: { xs: 3, md: 4 } }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
            <LockResetIcon sx={{ color: COLORS.blue }} />
            <Typography sx={{ fontWeight: 800, color: COLORS.blue, fontSize: '1.15rem' }}>
              Changer le mot de passe
            </Typography>
          </Box>

          <Typography sx={{ color: COLORS.muted, fontSize: '0.88rem', mb: 2 }}>
            Pour votre sécurité, vous devez définir un nouveau mot de passe avant d'accéder à l'intranet.
          </Typography>

          {succes ? (
            <Alert severity="success">Mot de passe modifié avec succès. Redirection…</Alert>
          ) : (
            <>
              {erreur && <Alert severity="error" sx={{ mb: 2 }}>{erreur}</Alert>}

              <TextField label="Mot de passe actuel" type="password" value={actuel}
                onChange={(e) => setActuel(e.target.value)} fullWidth required autoComplete="current-password" sx={{ mb: 2 }} />
              <TextField label="Nouveau mot de passe" type="password" value={nouveau}
                onChange={(e) => setNouveau(e.target.value)} fullWidth required autoComplete="new-password" sx={{ mb: 2 }} />
              <TextField label="Confirmer le nouveau mot de passe" type="password" value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)} fullWidth required autoComplete="new-password" sx={{ mb: 2 }} />

              <Box sx={{ backgroundColor: COLORS.bg, borderRadius: 2, p: 1.5, mb: 2.5 }}>
                <Typography sx={{ fontWeight: 700, color: COLORS.ink, fontSize: '0.8rem', mb: 0.5 }}>
                  Règles du mot de passe
                </Typography>
                <Box component="ul" sx={{ pl: 2.5, m: 0, color: COLORS.muted, fontSize: '0.8rem', '& li': { mb: 0.25 } }}>
                  {REGLES.map((r) => <li key={r}>{r}</li>)}
                </Box>
              </Box>

              <Button type="submit" variant="contained" fullWidth size="large" disabled={chargement}
                sx={{ backgroundColor: COLORS.blue, fontWeight: 700, py: 1.2, '&:hover': { backgroundColor: COLORS.blueHover } }}>
                {chargement ? 'Enregistrement…' : 'Valider le nouveau mot de passe'}
              </Button>
            </>
          )}
        </Card>
      </Box>
    </Box>
  );
}
