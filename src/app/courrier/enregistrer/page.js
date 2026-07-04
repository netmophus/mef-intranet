'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Paper, TextField, MenuItem, Button, Autocomplete, Alert, Grid,
  CircularProgress,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import IntranetShell from '@/components/IntranetShell';
import AccesRefuse from '@/components/AccesRefuse';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { COLORS, TRICOLOR } from '@/theme';

function aujourdhui() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const VIDE = () => ({
  scan: null, date_document: '', date_arrivee: aujourdhui(), correspondant: null,
  objet: '', nombre_pieces: 1, confidentialite: 'ORDINAIRE', delai_reponse: '',
});

export default function EnregistrerCourrier() {
  const router = useRouter();
  const { loading, has } = useAuth();
  const autorise = has('courrier.enregistrer_courrier');

  const [f, setF] = useState(VIDE());
  const [correspondants, setCorrespondants] = useState([]);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState(null); // { numero_ordre, id }
  const dropRef = useRef(null);
  const inputFichier = useRef(null);

  useEffect(() => {
    if (autorise) apiGet('/api/v1/courriers/correspondants/').then(setCorrespondants).catch(() => {});
  }, [autorise]);

  function maj(champ, valeur) { setF((old) => ({ ...old, [champ]: valeur })); }

  function choisirFichier(fichier) {
    if (!fichier) return;
    if (!fichier.name.toLowerCase().endsWith('.pdf')) { setErreur('Le scan doit être un fichier PDF.'); return; }
    setErreur('');
    maj('scan', fichier);
  }

  async function resoudreCorrespondant() {
    const val = f.correspondant;
    if (val && typeof val === 'object' && val.id) return val.id;
    const nom = (typeof val === 'string' ? val : '').trim();
    if (!nom) return null;
    const exist = correspondants.find((c) => c.nom.toLowerCase() === nom.toLowerCase());
    if (exist) return exist.id;
    const cree = await apiPost('/api/v1/courriers/correspondants/', { nom });
    setCorrespondants((old) => [...old, cree]);
    return cree.id;
  }

  async function soumettre(e) {
    if (e) e.preventDefault();
    setErreur('');
    if (!f.scan) { setErreur('Veuillez joindre le scan PDF.'); return; }
    if (!f.date_document) { setErreur('La date du document est obligatoire.'); return; }
    if (!f.objet.trim()) { setErreur("L'objet est obligatoire."); return; }
    setEnvoi(true);
    try {
      const corrId = await resoudreCorrespondant();
      if (!corrId) { setErreur('Le correspondant est obligatoire.'); setEnvoi(false); return; }

      const fd = new FormData();
      fd.append('scan', f.scan);
      fd.append('date_document', f.date_document);
      fd.append('date_arrivee', f.date_arrivee);
      fd.append('correspondant', String(corrId));
      fd.append('objet', f.objet.trim());
      fd.append('nombre_pieces', String(f.nombre_pieces || 1));
      fd.append('confidentialite', f.confidentialite);
      if (f.delai_reponse) fd.append('delai_reponse', f.delai_reponse);

      const c = await apiPost('/api/v1/courriers/', fd);
      setResultat({ numero_ordre: c.numero_ordre, id: c.id });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.data && typeof err.data === 'object') {
        const premier = Object.values(err.data)[0];
        setErreur(Array.isArray(premier) ? premier[0] : (err.data.detail || 'Données invalides.'));
      } else if (err instanceof ApiError && err.status >= 500) {
        setErreur('Erreur serveur. Veuillez réessayer.');
      } else {
        setErreur('Échec de l\'enregistrement. Vérifiez votre connexion.');
      }
      setEnvoi(false);
    }
  }

  function suivant() {
    setResultat(null);
    setF(VIDE());
    setEnvoi(false);
    setTimeout(() => dropRef.current && dropRef.current.focus(), 50);
  }

  if (loading) {
    return <IntranetShell><Box sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Box></IntranetShell>;
  }
  if (!autorise) {
    return <IntranetShell><AccesRefuse message="L'enregistrement du courrier requiert une autorisation." /></IntranetShell>;
  }

  // Écran de confirmation
  if (resultat) {
    return (
      <IntranetShell>
        <Box sx={{ maxWidth: 640, mx: 'auto', mt: { xs: 2, md: 5 }, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 60, color: COLORS.green, mb: 1 }} />
          <Typography sx={{ color: COLORS.muted, fontWeight: 700, letterSpacing: 1 }}>
            COURRIER ENREGISTRÉ — NUMÉRO D'ORDRE
          </Typography>
          <Paper elevation={0} sx={{ my: 2, py: 3, border: `2px solid ${COLORS.blue}`, borderRadius: 3 }}>
            <Typography sx={{ fontWeight: 900, color: COLORS.blue, fontSize: { xs: '2.4rem', md: '3.4rem' }, letterSpacing: 2, lineHeight: 1 }}>
              {resultat.numero_ordre}
            </Typography>
            <Box sx={{ width: 90, height: 4, background: TRICOLOR, borderRadius: 2, mx: 'auto', mt: 2 }} />
          </Paper>
          <Typography sx={{ color: COLORS.ink, mb: 3 }}>
            Reportez ce numéro sur le cachet apposé sur le courrier papier.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" size="large" onClick={suivant}
              sx={{ backgroundColor: COLORS.blue, fontWeight: 700, '&:hover': { backgroundColor: COLORS.blueHover } }}>
              Enregistrer le suivant
            </Button>
            <Button variant="outlined" size="large" onClick={() => router.push(`/courrier/${resultat.id}`)}
              sx={{ fontWeight: 700 }}>
              Voir la fiche
            </Button>
          </Box>
        </Box>
      </IntranetShell>
    );
  }

  return (
    <IntranetShell>
      <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.blue, mb: 2 }}>
        Enregistrer un courrier arrivée
      </Typography>

      <Paper component="form" onSubmit={soumettre} elevation={0}
        sx={{ p: { xs: 2, md: 3 }, border: `1px solid ${COLORS.border}`, borderRadius: 3, maxWidth: 780 }}>
        {erreur && <Alert severity="error" sx={{ mb: 2 }}>{erreur}</Alert>}

        {/* 1. Scan (dropzone) */}
        <Box
          ref={dropRef}
          tabIndex={0}
          onClick={() => inputFichier.current && inputFichier.current.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputFichier.current.click(); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); choisirFichier(e.dataTransfer.files[0]); }}
          sx={{
            border: `2px dashed ${f.scan ? COLORS.green : COLORS.border}`, borderRadius: 3,
            p: 3, textAlign: 'center', cursor: 'pointer', mb: 2.5,
            backgroundColor: f.scan ? `${COLORS.green}0a` : COLORS.bg,
            outline: 'none', '&:focus': { borderColor: COLORS.blue },
          }}
        >
          <input ref={inputFichier} type="file" accept="application/pdf" hidden
            onChange={(e) => choisirFichier(e.target.files[0])} />
          {f.scan ? (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: COLORS.greenDark }}>
              <PictureAsPdfIcon /> <Typography sx={{ fontWeight: 700 }}>{f.scan.name}</Typography>
            </Box>
          ) : (
            <Box sx={{ color: COLORS.muted }}>
              <UploadFileIcon sx={{ fontSize: 40 }} />
              <Typography sx={{ fontWeight: 700, mt: 0.5 }}>Déposer le scan PDF ou cliquer</Typography>
              <Typography sx={{ fontSize: '0.8rem' }}>PDF uniquement, 25 Mo maximum</Typography>
            </Box>
          )}
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Date du document" type="date" value={f.date_document}
              onChange={(e) => maj('date_document', e.target.value)} fullWidth required
              slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Date d'arrivée" type="date" value={f.date_arrivee}
              onChange={(e) => maj('date_arrivee', e.target.value)} fullWidth
              slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Autocomplete
              freeSolo options={correspondants} getOptionLabel={(o) => (typeof o === 'string' ? o : o.nom)}
              value={f.correspondant}
              onChange={(e, v) => maj('correspondant', v)}
              onInputChange={(e, v) => { if (typeof f.correspondant !== 'object') maj('correspondant', v); }}
              renderInput={(params) => (
                <TextField {...params} label="Correspondant (émetteur)" required
                  helperText="Choisir dans la liste ou saisir un nouveau nom" />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="Objet" value={f.objet} onChange={(e) => maj('objet', e.target.value)}
              fullWidth required slotProps={{ htmlInput: { maxLength: 500 } }} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField label="Nb pièces" type="number" value={f.nombre_pieces}
              onChange={(e) => maj('nombre_pieces', Math.max(1, Number(e.target.value) || 1))}
              fullWidth slotProps={{ htmlInput: { min: 1 } }} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField label="Confidentialité" select value={f.confidentialite}
              onChange={(e) => maj('confidentialite', e.target.value)} fullWidth>
              <MenuItem value="ORDINAIRE">Ordinaire</MenuItem>
              <MenuItem value="CONFIDENTIEL">Confidentiel</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField label="Délai de réponse (optionnel)" type="date" value={f.delai_reponse}
              onChange={(e) => maj('delai_reponse', e.target.value)} fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              onKeyDown={(e) => { if (e.key === 'Enter') soumettre(e); }} />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" variant="contained" size="large" disabled={envoi}
            sx={{ backgroundColor: COLORS.blue, fontWeight: 700, px: 4, '&:hover': { backgroundColor: COLORS.blueHover } }}>
            {envoi ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </Box>
      </Paper>
    </IntranetShell>
  );
}
