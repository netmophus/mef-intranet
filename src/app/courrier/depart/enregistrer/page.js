'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Paper, TextField, Button, Autocomplete, Alert, Grid, CircularProgress,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import OutboxIcon from '@mui/icons-material/Outbox';
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
  scan: null, structure: null, objet: '', destinataire: null, ampliations: [],
  signataire_nom: '', signataire_qualite: '', date_signature: aujourdhui(), origine: null,
});

export default function EnregistrerDepart() {
  const router = useRouter();
  const { loading, has } = useAuth();
  const autorise = has('courrier.enregistrer_courrier');

  const [f, setF] = useState(VIDE());
  const [directions, setDirections] = useState([]);
  const [correspondants, setCorrespondants] = useState([]);
  const [arrivees, setArrivees] = useState([]);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState(null);
  const inputFichier = useRef(null);

  useEffect(() => {
    if (!autorise) return;
    apiGet('/api/v1/directions/').then(setDirections).catch(() => {});
    apiGet('/api/v1/courriers/correspondants/').then(setCorrespondants).catch(() => {});
    apiGet('/api/v1/courriers/?sens=ARRIVEE&page_size=100')
      .then((d) => setArrivees((d.results || []).filter((c) => ['IMPUTE', 'EN_TRAITEMENT'].includes(c.statut))))
      .catch(() => {});
  }, [autorise]);

  const maj = (champ, valeur) => setF((o) => ({ ...o, [champ]: valeur }));

  function choisirFichier(fichier) {
    if (!fichier) return;
    if (!fichier.name.toLowerCase().endsWith('.pdf')) { setErreur('Le scan doit être un fichier PDF.'); return; }
    setErreur(''); maj('scan', fichier);
  }

  async function soumettre(e) {
    if (e) e.preventDefault();
    setErreur('');
    if (!f.structure) { setErreur('La structure émettrice est obligatoire.'); return; }
    if (!f.objet.trim()) { setErreur("L'objet est obligatoire."); return; }
    if (!f.destinataire) { setErreur('Le destinataire principal est obligatoire.'); return; }
    setEnvoi(true);
    try {
      const fd = new FormData();
      fd.append('sens', 'DEPART');
      fd.append('structure_emettrice', String(f.structure.id));
      fd.append('objet', f.objet.trim());
      fd.append('correspondant', String(f.destinataire.id));
      fd.append('signataire_nom', f.signataire_nom.trim());
      fd.append('signataire_qualite', f.signataire_qualite.trim());
      if (f.date_signature) fd.append('date_signature', f.date_signature);
      f.ampliations.forEach((a) => fd.append('ampliations', String(a.id)));
      if (f.origine) fd.append('courrier_origine', String(f.origine.id));
      if (f.scan) fd.append('scan', f.scan);
      const c = await apiPost('/api/v1/courriers/', fd);
      setResultat({ reference: c.reference_complete, id: c.id, a_scan: c.a_scan });
    } catch (err) {
      setErreur(err instanceof ApiError && err.data ? (Array.isArray(Object.values(err.data)[0]) ? Object.values(err.data)[0][0] : (err.data.detail || 'Données invalides.')) : "Échec de l'enregistrement.");
      setEnvoi(false);
    }
  }

  function suivant() { setResultat(null); setF(VIDE()); setEnvoi(false); }

  if (loading) return <IntranetShell><Box sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Box></IntranetShell>;
  if (!autorise) return <IntranetShell><AccesRefuse message="L'enregistrement du courrier requiert une autorisation." /></IntranetShell>;

  if (resultat) {
    return (
      <IntranetShell>
        <Box sx={{ maxWidth: 680, mx: 'auto', mt: { xs: 2, md: 5 }, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 60, color: COLORS.green, mb: 1 }} />
          <Typography sx={{ color: COLORS.muted, fontWeight: 700, letterSpacing: 1 }}>
            COURRIER DÉPART ENREGISTRÉ — RÉFÉRENCE OFFICIELLE
          </Typography>
          <Paper elevation={0} sx={{ my: 2, py: 3, px: 2, border: `2px solid ${COLORS.blue}`, borderRadius: 3 }}>
            <Typography sx={{ fontWeight: 900, color: COLORS.blue, fontSize: { xs: '1.5rem', md: '2.3rem' }, letterSpacing: 1, lineHeight: 1.1, wordBreak: 'break-word' }}>
              {resultat.reference}
            </Typography>
            <Box sx={{ width: 90, height: 4, background: TRICOLOR, borderRadius: 2, mx: 'auto', mt: 2 }} />
          </Paper>
          <Alert severity="info" sx={{ textAlign: 'left', mb: 3, borderRadius: 2 }}>
            Reportez cette référence sur l'original si ce n'est pas déjà fait, puis
            {resultat.a_scan ? ' le courrier est prêt à être expédié.' : ' attachez le scan signé depuis la fiche avant l\'expédition.'}
          </Alert>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" size="large" onClick={suivant}
              sx={{ backgroundColor: COLORS.blue, fontWeight: 700, '&:hover': { backgroundColor: COLORS.blueHover } }}>
              Enregistrer le suivant
            </Button>
            <Button variant="outlined" size="large" onClick={() => router.push(`/courrier/${resultat.id}`)} sx={{ fontWeight: 700 }}>
              Voir la fiche
            </Button>
          </Box>
        </Box>
      </IntranetShell>
    );
  }

  return (
    <IntranetShell>
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.3 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, backgroundColor: `${COLORS.green}1f`, color: COLORS.greenDark,
            display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 24 } }}>
            <OutboxIcon />
          </Box>
          <Typography component="h1" sx={{ fontWeight: 800, color: COLORS.blue, fontSize: { xs: '1.4rem', md: '1.7rem' } }}>
            Enregistrer un courrier départ
          </Typography>
        </Box>
        <Box sx={{ width: 64, height: 4, borderRadius: 2, background: TRICOLOR, mt: 1.2, ml: 0.2 }} />
      </Box>

      <Paper component="form" onSubmit={soumettre} elevation={0}
        sx={{ p: { xs: 2, md: 3 }, border: `1px solid ${COLORS.border}`, borderRadius: 3, maxWidth: 860, boxShadow: '0 8px 22px rgba(0,40,80,0.06)' }}>
        {erreur && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{erreur}</Alert>}

        <Typography sx={{ fontWeight: 800, color: COLORS.blueDark, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 0.6, mb: 1 }}>
          Document signé (optionnel à ce stade)
        </Typography>
        <Box onClick={() => inputFichier.current?.click()}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); choisirFichier(e.dataTransfer.files[0]); }}
          sx={{ border: `2px dashed ${f.scan ? COLORS.green : COLORS.border}`, borderRadius: 3, p: 2.5, textAlign: 'center',
            cursor: 'pointer', mb: 2.5, backgroundColor: f.scan ? `${COLORS.green}0a` : COLORS.bg }}>
          <input ref={inputFichier} type="file" accept="application/pdf" hidden onChange={(e) => choisirFichier(e.target.files[0])} />
          {f.scan ? (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: COLORS.greenDark }}>
              <PictureAsPdfIcon /> <Typography sx={{ fontWeight: 700 }}>{f.scan.name}</Typography>
            </Box>
          ) : (
            <Box sx={{ color: COLORS.muted }}>
              <UploadFileIcon sx={{ fontSize: 34 }} />
              <Typography sx={{ fontWeight: 700, mt: 0.5, fontSize: '0.9rem' }}>Déposer le scan signé, ou l'attacher plus tard</Typography>
            </Box>
          )}
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete options={directions} value={f.structure} onChange={(e, v) => maj('structure', v)}
              getOptionLabel={(o) => `${o.sigle} — ${o.nom}`} isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(p) => <TextField {...p} label="Structure émettrice" required />} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete options={correspondants} value={f.destinataire} onChange={(e, v) => maj('destinataire', v)}
              getOptionLabel={(o) => o.nom} isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(p) => <TextField {...p} label="Destinataire principal" required />} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="Objet" value={f.objet} onChange={(e) => maj('objet', e.target.value)} fullWidth required
              slotProps={{ htmlInput: { maxLength: 500 } }} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Autocomplete multiple options={correspondants} value={f.ampliations} onChange={(e, v) => maj('ampliations', v)}
              getOptionLabel={(o) => o.nom} isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(p) => <TextField {...p} label="Ampliations (copies pour information)" placeholder="Optionnel" />} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Signataire — nom" value={f.signataire_nom} onChange={(e) => maj('signataire_nom', e.target.value)} fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Signataire — qualité" value={f.signataire_qualite} onChange={(e) => maj('signataire_qualite', e.target.value)} fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Date de signature" type="date" value={f.date_signature}
              onChange={(e) => maj('date_signature', e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete options={arrivees} value={f.origine} onChange={(e, v) => maj('origine', v)}
              getOptionLabel={(o) => `${o.numero_ordre} — ${o.objet}`} isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(p) => <TextField {...p} label="Répond à (courrier arrivée)" placeholder="Optionnel" />} />
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
