'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Paper, Grid, Chip, Button, Divider, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import LockIcon from '@mui/icons-material/Lock';
import IntranetShell from '@/components/IntranetShell';
import AccesRefuse from '@/components/AccesRefuse';
import { apiGet, apiPatch, apiPost, BASE_API, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { COLORS, TRICOLOR } from '@/theme';

function Ligne({ label, valeur }) {
  return (
    <Box sx={{ mb: 1.25 }}>
      <Typography sx={{ color: COLORS.muted, fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography sx={{ color: COLORS.ink, fontSize: '0.95rem' }}>{valeur || '—'}</Typography>
    </Box>
  );
}

function horodate(iso) {
  try { return new Date(iso).toLocaleString('fr-FR'); } catch { return iso; }
}

export default function FicheCourrier() {
  const { id } = useParams();
  const router = useRouter();
  const { loading, has } = useAuth();

  const [courrier, setCourrier] = useState(null);
  const [erreur, setErreur] = useState('');
  const [ouvertModif, setOuvertModif] = useState(false);
  const [form, setForm] = useState(null);
  const [correspondants, setCorrespondants] = useState([]);
  const [enCours, setEnCours] = useState(false);
  const [errModif, setErrModif] = useState('');

  const charger = useCallback(async () => {
    try {
      const c = await apiGet(`/api/v1/courriers/${id}/`);
      setCourrier(c);
    } catch (e) {
      setErreur(e.status === 404 ? 'Courrier introuvable ou non autorisé.'
        : (e.status >= 500 ? 'Erreur serveur.' : 'Impossible de charger le courrier.'));
    }
  }, [id]);

  useEffect(() => { if (has('courrier.consulter_courrier')) charger(); }, [has, charger]);

  function ouvrirModif() {
    setErrModif('');
    setForm({
      objet: courrier.objet,
      correspondant: courrier.correspondant.id,
      date_document: courrier.date_document,
      date_arrivee: courrier.date_arrivee,
      nombre_pieces: courrier.nombre_pieces,
      confidentialite: courrier.confidentialite,
      delai_reponse: courrier.delai_reponse || '',
    });
    apiGet('/api/v1/courriers/correspondants/').then(setCorrespondants).catch(() => {});
    setOuvertModif(true);
  }

  async function enregistrerModif() {
    setEnCours(true);
    setErrModif('');
    try {
      const payload = { ...form };
      if (!payload.delai_reponse) payload.delai_reponse = null;
      const c = await apiPatch(`/api/v1/courriers/${id}/`, payload);
      setCourrier(c);
      setOuvertModif(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.data && typeof err.data === 'object') {
        const p = Object.values(err.data)[0];
        setErrModif(Array.isArray(p) ? p[0] : (err.data.detail || 'Données invalides.'));
      } else {
        setErrModif('Échec de la modification.');
      }
    } finally {
      setEnCours(false);
    }
  }

  async function classer() {
    if (!window.confirm('Classer ce courrier sans suite ? Cette action est définitive pour ce lot.')) return;
    try {
      const c = await apiPost(`/api/v1/courriers/${id}/classer/`);
      setCourrier(c);
    } catch (err) {
      setErreur(err.status === 409 ? 'Ce courrier ne peut plus être classé.' : 'Échec du classement.');
    }
  }

  if (loading) {
    return <IntranetShell><Box sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Box></IntranetShell>;
  }
  if (!has('courrier.consulter_courrier')) {
    return <IntranetShell><AccesRefuse message="La consultation du courrier requiert une autorisation." /></IntranetShell>;
  }
  if (erreur) {
    return <IntranetShell><Alert severity="warning" sx={{ mt: 2 }}>{erreur}</Alert></IntranetShell>;
  }
  if (!courrier) {
    return <IntranetShell><Box sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Box></IntranetShell>;
  }

  const peutModifier = has('courrier.modifier_courrier');
  const peutClasser = has('courrier.classer_courrier') && courrier.statut === 'ENREGISTRE';

  return (
    <IntranetShell>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Button onClick={() => router.push('/courrier')} sx={{ color: COLORS.blue }}>← Retour</Button>
        <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.blue }}>{courrier.numero_ordre}</Typography>
        <Chip label={courrier.statut_libelle} size="small"
          sx={{ backgroundColor: `${COLORS.blue}14`, color: COLORS.blue, fontWeight: 700 }} />
        {courrier.confidentialite === 'CONFIDENTIEL' && (
          <Chip icon={<LockIcon />} label="Confidentiel" size="small"
            sx={{ backgroundColor: `${COLORS.orange}1f`, color: COLORS.orange, fontWeight: 700 }} />
        )}
        <Box sx={{ flex: 1 }} />
        {peutModifier && <Button startIcon={<EditIcon />} onClick={ouvrirModif} variant="outlined" sx={{ fontWeight: 700 }}>Modifier</Button>}
        {peutClasser && <Button startIcon={<ArchiveIcon />} onClick={classer} variant="outlined" color="warning" sx={{ fontWeight: 700 }}>Classer sans suite</Button>}
      </Box>

      <Grid container spacing={2}>
        {/* Visionneuse PDF */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 2, overflow: 'hidden', height: { xs: 420, md: '72vh' } }}>
            {courrier.a_scan ? (
              <Box component="iframe" title="Scan du courrier"
                src={`${BASE_API}/api/v1/courriers/${courrier.id}/scan/`}
                sx={{ width: '100%', height: '100%', border: 0 }} />
            ) : (
              <Box sx={{ p: 4, textAlign: 'center', color: COLORS.muted }}>Aucun scan disponible.</Box>
            )}
          </Paper>
        </Grid>

        {/* Métadonnées + chronologie */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${COLORS.border}`, borderRadius: 2, mb: 2 }}>
            <Ligne label="Correspondant" valeur={courrier.correspondant.nom} />
            <Ligne label="Objet" valeur={courrier.objet} />
            <Grid container spacing={1}>
              <Grid size={6}><Ligne label="Date du document" valeur={courrier.date_document} /></Grid>
              <Grid size={6}><Ligne label="Date d'arrivée" valeur={courrier.date_arrivee} /></Grid>
              <Grid size={6}><Ligne label="Nb pièces" valeur={courrier.nombre_pieces} /></Grid>
              <Grid size={6}><Ligne label="Délai de réponse" valeur={courrier.delai_reponse} /></Grid>
            </Grid>
            <Ligne label="Enregistré par" valeur={`${courrier.enregistre_par.nom_complet} (${courrier.enregistre_par.matricule})`} />
            <Typography sx={{ color: COLORS.muted, fontSize: '0.7rem', mt: 1, wordBreak: 'break-all' }}>
              SHA-256 : {courrier.hash_sha256}
            </Typography>
          </Paper>

          <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${COLORS.border}`, borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 800, color: COLORS.blue, mb: 1.5 }}>Chronologie</Typography>
            {courrier.evenements.map((e, i) => (
              <Box key={e.id} sx={{ display: 'flex', gap: 1.5 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.4 }}>
                  <Box sx={{ width: 11, height: 11, borderRadius: '50%', background: TRICOLOR, flexShrink: 0 }} />
                  {i < courrier.evenements.length - 1 && <Box sx={{ flex: 1, width: 2, backgroundColor: COLORS.border, mt: 0.5 }} />}
                </Box>
                <Box sx={{ pb: 2 }}>
                  <Typography sx={{ fontWeight: 700, color: COLORS.ink, fontSize: '0.9rem' }}>{e.type_libelle}</Typography>
                  <Typography sx={{ color: COLORS.muted, fontSize: '0.78rem' }}>
                    {e.acteur.nom_complet} · {horodate(e.horodatage)}
                  </Typography>
                  {e.details && e.details.avant && (
                    <Typography sx={{ color: COLORS.muted, fontSize: '0.74rem', mt: 0.25 }}>
                      {Object.keys(e.details.avant).join(', ')} modifié(s)
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog modification */}
      <Dialog open={ouvertModif} onClose={() => setOuvertModif(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: COLORS.blue }}>Modifier le courrier</DialogTitle>
        <DialogContent dividers>
          {errModif && <Alert severity="error" sx={{ mb: 2 }}>{errModif}</Alert>}
          {form && (
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid size={12}>
                <TextField label="Objet" value={form.objet} fullWidth
                  onChange={(e) => setForm({ ...form, objet: e.target.value })} />
              </Grid>
              <Grid size={12}>
                <TextField label="Correspondant" select value={form.correspondant} fullWidth
                  onChange={(e) => setForm({ ...form, correspondant: e.target.value })}>
                  {correspondants.map((c) => <MenuItem key={c.id} value={c.id}>{c.nom}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={6}>
                <TextField label="Date du document" type="date" value={form.date_document} fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(e) => setForm({ ...form, date_document: e.target.value })} />
              </Grid>
              <Grid size={6}>
                <TextField label="Date d'arrivée" type="date" value={form.date_arrivee} fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(e) => setForm({ ...form, date_arrivee: e.target.value })} />
              </Grid>
              <Grid size={6}>
                <TextField label="Nb pièces" type="number" value={form.nombre_pieces} fullWidth
                  slotProps={{ htmlInput: { min: 1 } }}
                  onChange={(e) => setForm({ ...form, nombre_pieces: Math.max(1, Number(e.target.value) || 1) })} />
              </Grid>
              <Grid size={6}>
                <TextField label="Confidentialité" select value={form.confidentialite} fullWidth
                  onChange={(e) => setForm({ ...form, confidentialite: e.target.value })}>
                  <MenuItem value="ORDINAIRE">Ordinaire</MenuItem>
                  <MenuItem value="CONFIDENTIEL">Confidentiel</MenuItem>
                </TextField>
              </Grid>
              <Grid size={12}>
                <TextField label="Délai de réponse" type="date" value={form.delai_reponse} fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(e) => setForm({ ...form, delai_reponse: e.target.value })} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOuvertModif(false)}>Annuler</Button>
          <Button variant="contained" onClick={enregistrerModif} disabled={enCours}
            sx={{ backgroundColor: COLORS.blue, fontWeight: 700, '&:hover': { backgroundColor: COLORS.blueHover } }}>
            {enCours ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </IntranetShell>
  );
}
