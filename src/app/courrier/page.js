'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  TextField, MenuItem, Chip, InputAdornment, IconButton, Pagination, Tooltip, CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LockIcon from '@mui/icons-material/Lock';
import IntranetShell from '@/components/IntranetShell';
import AccesRefuse from '@/components/AccesRefuse';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { COLORS } from '@/theme';

const STATUT_COULEUR = {
  ENREGISTRE: { c: COLORS.blue, bg: `${COLORS.blue}14` },
  CLASSE: { c: COLORS.muted, bg: '#0000000d' },
  IMPUTE: { c: COLORS.gold, bg: `${COLORS.gold}22` },
  EN_TRAITEMENT: { c: COLORS.orange, bg: `${COLORS.orange}1f` },
  TRAITE: { c: COLORS.green, bg: `${COLORS.green}1f` },
};

function ChipStatut({ statut, libelle }) {
  const s = STATUT_COULEUR[statut] || STATUT_COULEUR.ENREGISTRE;
  return <Chip label={libelle} size="small" sx={{ backgroundColor: s.bg, color: s.c, fontWeight: 700 }} />;
}

export default function ListeCourrier() {
  const router = useRouter();
  const { loading, has } = useAuth();
  const autorise = has('courrier.consulter_courrier');

  const [q, setQ] = useState('');
  const [qActif, setQActif] = useState('');
  const [statut, setStatut] = useState('');
  const [correspondant, setCorrespondant] = useState('');
  const [correspondants, setCorrespondants] = useState([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ count: 0, results: [] });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (!autorise) return;
    apiGet('/api/v1/courriers/correspondants/').then(setCorrespondants).catch(() => {});
  }, [autorise]);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      const p = new URLSearchParams();
      if (qActif) p.set('q', qActif);
      if (statut) p.set('statut', statut);
      if (correspondant) p.set('correspondant', correspondant);
      p.set('page', String(page));
      const d = await apiGet(`/api/v1/courriers/?${p.toString()}`);
      setData(d);
    } catch (e) {
      setErreur(e.status >= 500 ? 'Erreur serveur, réessayez.' : 'Impossible de charger les courriers.');
    } finally {
      setChargement(false);
    }
  }, [qActif, statut, correspondant, page]);

  useEffect(() => { if (autorise) charger(); }, [autorise, charger]);

  if (loading) {
    return <IntranetShell><Box sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Box></IntranetShell>;
  }
  if (!autorise) {
    return <IntranetShell><AccesRefuse message="La consultation du courrier requiert une autorisation." /></IntranetShell>;
  }

  const pages = Math.max(1, Math.ceil((data.count || 0) / 20));

  return (
    <IntranetShell>
      <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.blue, mb: 2 }}>
        Courrier arrivée
      </Typography>

      {/* Filtres */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: `1px solid ${COLORS.border}`, borderRadius: 2,
        display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <TextField
          size="small" placeholder="Rechercher (numéro, objet, correspondant)…" value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); setQActif(q); } }}
          sx={{ flex: 1, minWidth: 240 }}
          slotProps={{ input: { startAdornment: (
            <InputAdornment position="start"><SearchIcon sx={{ color: COLORS.muted }} /></InputAdornment>
          ) } }}
        />
        <TextField size="small" select label="Statut" value={statut}
          onChange={(e) => { setPage(1); setStatut(e.target.value); }} sx={{ minWidth: 160 }}>
          <MenuItem value="">Tous</MenuItem>
          <MenuItem value="ENREGISTRE">Enregistré</MenuItem>
          <MenuItem value="CLASSE">Classé sans suite</MenuItem>
        </TextField>
        <TextField size="small" select label="Correspondant" value={correspondant}
          onChange={(e) => { setPage(1); setCorrespondant(e.target.value); }} sx={{ minWidth: 200 }}>
          <MenuItem value="">Tous</MenuItem>
          {correspondants.map((c) => <MenuItem key={c.id} value={c.id}>{c.nom}</MenuItem>)}
        </TextField>
      </Paper>

      <Typography sx={{ color: COLORS.muted, fontSize: '0.85rem', mb: 1 }}>
        {data.count} courrier{data.count > 1 ? 's' : ''}
      </Typography>

      <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 800, color: COLORS.blue, backgroundColor: COLORS.bg } }}>
              <TableCell>Numéro</TableCell>
              <TableCell>Arrivée</TableCell>
              <TableCell>Correspondant</TableCell>
              <TableCell>Objet</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="center">Conf.</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {chargement ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={26} /></TableCell></TableRow>
            ) : erreur ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: COLORS.orange }}>{erreur}</TableCell></TableRow>
            ) : data.results.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: COLORS.muted }}>Aucun courrier.</TableCell></TableRow>
            ) : data.results.map((c) => (
              <TableRow key={c.id} hover onClick={() => router.push(`/courrier/${c.id}`)} sx={{ cursor: 'pointer' }}>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{c.numero_ordre}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{c.date_arrivee}</TableCell>
                <TableCell>{c.correspondant_nom}</TableCell>
                <TableCell sx={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.objet}
                </TableCell>
                <TableCell><ChipStatut statut={c.statut} libelle={c.statut_libelle} /></TableCell>
                <TableCell align="center">
                  {c.confidentialite === 'CONFIDENTIEL' && (
                    <Tooltip title="Confidentiel"><LockIcon sx={{ fontSize: 18, color: COLORS.orange }} /></Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={pages} page={page} onChange={(e, v) => setPage(v)} color="primary" />
        </Box>
      )}
    </IntranetShell>
  );
}
