'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Button, Chip, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SendIcon from '@mui/icons-material/Send';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import IntranetShell from '@/components/IntranetShell';
import AccesRefuse from '@/components/AccesRefuse';
import { apiGet, apiPost, apiBase, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { COLORS, TRICOLOR } from '@/theme';

const anciennete = (iso) => iso ? Math.floor((Date.now() - new Date(iso + 'T00:00:00')) / 86400000) : null;

function SectionTitre({ children, couleur = COLORS.blue }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mt: 4, mb: 1.5 }}>
      <Box sx={{ width: 30, height: 4, borderRadius: 2, background: TRICOLOR }} />
      <Typography component="h2" sx={{ color: couleur, fontWeight: 800, fontSize: '1.1rem' }}>{children}</Typography>
    </Box>
  );
}

export default function Expeditions() {
  const router = useRouter();
  const { loading, has } = useAuth();
  const autorise = has('courrier.enregistrer_courrier');

  const [aExpedier, setAExpedier] = useState([]);
  const [aPointer, setAPointer] = useState([]);
  const [erreur, setErreur] = useState('');
  const [charge, setCharge] = useState(false);
  const [decharge, setDecharge] = useState(null); // courrier à pointer
  const [dDate, setDDate] = useState('');
  const [dComm, setDComm] = useState('');
  const [errD, setErrD] = useState('');

  const charger = useCallback(async () => {
    setCharge(true); setErreur('');
    try {
      const [enr, ptg] = await Promise.all([
        apiGet('/api/v1/courriers/?sens=DEPART&statut=ENREGISTRE&page_size=100'),
        apiGet('/api/v1/courriers/?sens=DEPART&decharge=absente&page_size=100'),
      ]);
      setAExpedier((enr.results || []).filter((c) => c.a_scan && !c.expedie_le));
      setAPointer(ptg.results || []);
    } catch { setErreur('Impossible de charger les expéditions.'); }
    finally { setCharge(false); }
  }, []);

  useEffect(() => { if (autorise) charger(); }, [autorise, charger]);

  async function expedier(c) {
    try { await apiPost(`/api/v1/courriers/${c.id}/expedier/`, {}); charger(); }
    catch (e) { setErreur(e instanceof ApiError && e.data?.detail ? e.data.detail : "Échec de l'expédition."); }
  }
  async function validerDecharge() {
    setErrD('');
    if (!dDate) { setErrD('La date est requise.'); return; }
    try {
      await apiPost(`/api/v1/courriers/${decharge.id}/decharge/`, { date: dDate, commentaire: dComm });
      setDecharge(null); setDDate(''); setDComm(''); charger();
    } catch (e) { setErrD(e instanceof ApiError && e.data?.detail ? e.data.detail : 'Échec du pointage.'); }
  }
  function bordereauDuJour() {
    const d = new Date();
    const j = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    window.open(`${apiBase()}/api/v1/bordereau/?date=${j}`, '_blank', 'noopener');
  }

  if (loading) return <IntranetShell><Box sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Box></IntranetShell>;
  if (!autorise) return <IntranetShell><AccesRefuse message="La gestion des expéditions requiert une autorisation." /></IntranetShell>;

  return (
    <IntranetShell>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.3 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, backgroundColor: `${COLORS.blue}14`, color: COLORS.blue,
              display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 24 } }}>
              <LocalShippingIcon />
            </Box>
            <Typography component="h1" sx={{ fontWeight: 800, color: COLORS.blue, fontSize: { xs: '1.4rem', md: '1.7rem' } }}>
              Expéditions & décharges
            </Typography>
          </Box>
          <Box sx={{ width: 64, height: 4, borderRadius: 2, background: TRICOLOR, mt: 1.2, ml: 0.2 }} />
        </Box>
        <Button onClick={bordereauDuJour} variant="contained" startIcon={<PictureAsPdfIcon />}
          sx={{ backgroundColor: COLORS.blue, fontWeight: 700, '&:hover': { backgroundColor: COLORS.blueHover } }}>
          Bordereau du jour
        </Button>
      </Box>

      {erreur && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{erreur}</Alert>}

      {/* À expédier */}
      <SectionTitre>À expédier ({aExpedier.length})</SectionTitre>
      <Tableau lignes={aExpedier} vide="Aucun courrier prêt à expédier." router={router}
        colonneAction={(c) => (
          <Button size="small" variant="contained" startIcon={<SendIcon />} onClick={() => expedier(c)}
            sx={{ backgroundColor: COLORS.blue, fontWeight: 700 }}>Marquer expédié</Button>
        )} charge={charge} />

      {/* À pointer (décharge) */}
      <SectionTitre couleur={COLORS.orange}>Expédiés — décharge en attente ({aPointer.length})</SectionTitre>
      <Tableau lignes={aPointer} vide="Aucune décharge en attente." router={router} montrerAge
        colonneAction={(c) => (
          <Button size="small" variant="outlined" startIcon={<FactCheckIcon />} onClick={() => { setDecharge(c); setErrD(''); }}
            sx={{ fontWeight: 700 }}>Pointer la décharge</Button>
        )} charge={charge} />

      <Dialog open={!!decharge} onClose={() => setDecharge(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: COLORS.blue }}>Pointer la décharge</DialogTitle>
        <DialogContent dividers>
          {errD && <Alert severity="error" sx={{ mb: 2 }}>{errD}</Alert>}
          <Typography sx={{ color: COLORS.muted, fontSize: '0.85rem', mb: 2 }}>{decharge?.reference_complete}</Typography>
          <TextField label="Date de la décharge" type="date" value={dDate} onChange={(e) => setDDate(e.target.value)}
            fullWidth required sx={{ mb: 2 }} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Commentaire (optionnel)" value={dComm} onChange={(e) => setDComm(e.target.value)}
            fullWidth multiline minRows={2} slotProps={{ htmlInput: { maxLength: 255 } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecharge(null)}>Annuler</Button>
          <Button variant="contained" onClick={validerDecharge}
            sx={{ backgroundColor: COLORS.green, fontWeight: 700, '&:hover': { backgroundColor: COLORS.greenDark } }}>Valider</Button>
        </DialogActions>
      </Dialog>
    </IntranetShell>
  );
}

function Tableau({ lignes, vide, colonneAction, router, montrerAge, charge }) {
  if (charge) return <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={24} /></Box>;
  if (lignes.length === 0) return <Typography sx={{ color: COLORS.muted, fontSize: '0.9rem', ml: 0.5 }}>{vide}</Typography>;
  return (
    <TableContainer component={Paper} elevation={0}
      sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: 'hidden', boxShadow: '0 8px 22px rgba(0,40,80,0.06)' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 800, color: COLORS.blueDark, backgroundColor: '#f2f6fb', fontSize: '0.72rem', textTransform: 'uppercase' } }}>
            <TableCell>Référence</TableCell><TableCell>Destinataire</TableCell><TableCell>Objet</TableCell>
            {montrerAge && <TableCell align="center">Expédié depuis</TableCell>}
            <TableCell align="right">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lignes.map((c) => (
            <TableRow key={c.id} hover sx={{ '&:hover td': { backgroundColor: '#f7fafd' } }}>
              <TableCell>
                <Box component="button" onClick={() => router.push(`/courrier/${c.id}`)}
                  sx={{ p: 0, border: 'none', background: 'none', cursor: 'pointer', color: COLORS.blue, fontWeight: 800, fontSize: '0.8rem', textAlign: 'left' }}>
                  {c.reference_complete || c.numero_ordre}
                </Box>
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{c.correspondant_nom}</TableCell>
              <TableCell sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: COLORS.ink }}>{c.objet}</TableCell>
              {montrerAge && (
                <TableCell align="center">
                  <Chip size="small" label={`${anciennete(c.expedie_le)} j`}
                    sx={{ fontWeight: 700, backgroundColor: anciennete(c.expedie_le) > 7 ? `${COLORS.orange}1f` : COLORS.bg, color: anciennete(c.expedie_le) > 7 ? COLORS.orange : COLORS.muted }} />
                </TableCell>
              )}
              <TableCell align="right">{colonneAction(c)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
