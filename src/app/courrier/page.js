'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  TextField, MenuItem, Chip, InputAdornment, Pagination, Tooltip, CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LockIcon from '@mui/icons-material/Lock';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import IntranetShell from '@/components/IntranetShell';
import AccesRefuse from '@/components/AccesRefuse';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { COLORS, TRICOLOR } from '@/theme';

const STATUT_COULEUR = {
  ENREGISTRE: { c: COLORS.blue, bg: `${COLORS.blue}14` },
  CLASSE: { c: COLORS.muted, bg: '#0000000d' },
  IMPUTE: { c: COLORS.goldDark, bg: `${COLORS.gold}22` },
  EN_TRAITEMENT: { c: COLORS.orange, bg: `${COLORS.orange}1f` },
  TRAITE: { c: COLORS.greenDark, bg: `${COLORS.green}1f` },
};

function ChipStatut({ statut, libelle }) {
  const s = STATUT_COULEUR[statut] || STATUT_COULEUR.ENREGISTRE;
  return <Chip label={libelle} size="small" sx={{ backgroundColor: s.bg, color: s.c, fontWeight: 700, borderRadius: 1.5 }} />;
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
      {/* En-tête */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.3 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, backgroundColor: `${COLORS.blue}14`, color: COLORS.blue,
              display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 24 } }}>
              <MarkEmailUnreadIcon />
            </Box>
            <Typography component="h1" sx={{ fontWeight: 800, color: COLORS.blue, fontSize: { xs: '1.4rem', md: '1.7rem' } }}>
              Courrier arrivée
            </Typography>
          </Box>
          <Box sx={{ width: 64, height: 4, borderRadius: 2, background: TRICOLOR, mt: 1.2, ml: 0.2 }} />
        </Box>
        <Chip
          label={`${data.count} courrier${data.count > 1 ? 's' : ''}`}
          sx={{ backgroundColor: '#fff', border: `1px solid ${COLORS.border}`, fontWeight: 700, color: COLORS.ink, alignSelf: 'center' }}
        />
      </Box>

      {/* Filtres */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, border: `1px solid ${COLORS.border}`, borderRadius: 3,
        boxShadow: '0 8px 22px rgba(0,40,80,0.05)', display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <TextField
          size="small" placeholder="Rechercher (numéro, objet, correspondant)…" value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); setQActif(q); } }}
          sx={{ flex: 1, minWidth: 240, '& .MuiOutlinedInput-root': { borderRadius: 999 } }}
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

      <TableContainer component={Paper} elevation={0}
        sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: 'hidden',
          boxShadow: '0 8px 22px rgba(0,40,80,0.06)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 800, color: COLORS.blueDark, backgroundColor: '#f2f6fb',
              borderBottom: `2px solid ${COLORS.border}`, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.3 } }}>
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
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}><CircularProgress size={26} /></TableCell></TableRow>
            ) : erreur ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: COLORS.orange, fontWeight: 600 }}>{erreur}</TableCell></TableRow>
            ) : data.results.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: COLORS.muted }}>Aucun courrier.</TableCell></TableRow>
            ) : data.results.map((c) => (
              <TableRow key={c.id} hover onClick={() => router.push(`/courrier/${c.id}`)}
                sx={{ cursor: 'pointer', '& td': { borderBottom: `1px solid ${COLORS.bg}` },
                  '&:hover td': { backgroundColor: '#f7fafd' } }}>
                <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap', color: COLORS.blue }}>{c.numero_ordre}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', color: COLORS.muted, fontSize: '0.85rem' }}>{c.date_arrivee}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{c.correspondant_nom}</TableCell>
                <TableCell sx={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: COLORS.ink }}>
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
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={pages} page={page} onChange={(e, v) => setPage(v)} color="primary" shape="rounded" />
        </Box>
      )}
    </IntranetShell>
  );
}
