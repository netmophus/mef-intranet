'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  LinearProgress, Chip, Button, IconButton, Tooltip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RefreshIcon from '@mui/icons-material/Refresh';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import IntranetShell from '@/components/IntranetShell';
import AccesRefuse from '@/components/AccesRefuse';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { COLORS, TRICOLOR } from '@/theme';

const RED = '#c0392b';

// --- utilitaires date ---
const two = (n) => String(n).padStart(2, '0');
const fmtDate = (iso) => { if (!iso) return null; const d = new Date(iso); return `${two(d.getDate())}/${two(d.getMonth() + 1)}`; };
const fmtHeure = (iso) => { const d = new Date(iso); return `${fmtDate(iso)} à ${two(d.getHours())}:${two(d.getMinutes())}`; };
const relanceRecente = (iso) => iso && (Date.now() - new Date(iso).getTime()) < 24 * 3600 * 1000;

// --- carte de synthèse ---
function StatCard({ icon: Icon, valeur, label, accent, alerte }) {
  const couleur = alerte && valeur > 0 ? accent : COLORS.blueDark;
  return (
    <Box sx={{ flex: '1 1 170px', minWidth: 0, p: 2, borderRadius: 3, backgroundColor: '#fff',
      border: `1px solid ${alerte && valeur > 0 ? accent : COLORS.border}`,
      boxShadow: alerte && valeur > 0 ? `0 8px 22px ${accent}22` : '0 8px 22px rgba(0,40,80,0.06)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, color: accent }}>
        <Icon sx={{ fontSize: 20 }} />
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.muted, lineHeight: 1.2 }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: '1.9rem', lineHeight: 1, color: couleur }}>{valeur}</Typography>
    </Box>
  );
}

function SectionTitre({ children, couleur = COLORS.blue }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mt: 4, mb: 1.5 }}>
      <Box sx={{ width: 30, height: 4, borderRadius: 2, background: TRICOLOR }} />
      <Typography component="h2" sx={{ color: couleur, fontWeight: 800, fontSize: '1.1rem' }}>{children}</Typography>
    </Box>
  );
}

// --- ligne d'une liste retard / délai proche ---
function LignePilotage({ l, couleur, onRelancer, onOuvrir }) {
  const recent = relanceRecente(l.derniere_relance_le);
  return (
    <TableRow hover sx={{ '&:hover td': { backgroundColor: '#f7fafd' } }}>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Box component="button" onClick={() => onOuvrir(l.courrier.id)}
          sx={{ p: 0, border: 'none', background: 'none', cursor: 'pointer', color: COLORS.blue, fontWeight: 800, fontSize: '0.85rem' }}>
          {l.courrier.numero}
        </Box>
      </TableCell>
      <TableCell sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: COLORS.ink }}>
        {l.courrier.objet}
      </TableCell>
      <TableCell><Chip size="small" label={l.direction_cible} sx={{ fontWeight: 700, backgroundColor: `${COLORS.blue}14`, color: COLORS.blue }} /></TableCell>
      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
        {l.jours_de_retard > 0
          ? <Chip size="small" label={`${l.jours_de_retard} j`} sx={{ fontWeight: 800, backgroundColor: `${couleur}1f`, color: couleur }} />
          : <Typography sx={{ fontSize: '0.82rem', color: COLORS.muted }}>{fmtDate(l.delai)}</Typography>}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {l.derniere_relance_le
          ? <Chip size="small" color="warning" variant="outlined" label={`Relancé le ${fmtDate(l.derniere_relance_le)}`} sx={{ fontWeight: 700 }} />
          : <Typography sx={{ fontSize: '0.8rem', color: COLORS.muted }}>—</Typography>}
      </TableCell>
      <TableCell align="right">
        <Tooltip title={recent ? 'Une relance a déjà été envoyée il y a moins de 24 h' : 'Relancer le destinataire'}>
          <span>
            <Button size="small" variant="outlined" disabled={recent}
              startIcon={<NotificationsActiveIcon />} onClick={() => onRelancer(l)}
              sx={{ fontWeight: 700, borderRadius: 999 }}>
              Relancer
            </Button>
          </span>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

function ListePilotage({ titre, couleur, lignes, vide, onRelancer, onOuvrir }) {
  return (
    <>
      <SectionTitre couleur={couleur}>{titre} ({lignes.length})</SectionTitre>
      {lignes.length === 0 ? (
        <Typography sx={{ color: COLORS.muted, fontSize: '0.9rem', ml: 0.5 }}>{vide}</Typography>
      ) : (
        <TableContainer component={Paper} elevation={0}
          sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: 'hidden', boxShadow: '0 8px 22px rgba(0,40,80,0.06)' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 800, color: COLORS.blueDark, backgroundColor: '#f2f6fb', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.3 } }}>
                <TableCell>N°</TableCell><TableCell>Objet</TableCell><TableCell>Direction</TableCell>
                <TableCell align="center">Retard / échéance</TableCell><TableCell>Dernière relance</TableCell><TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lignes.map((l) => (
                <LignePilotage key={l.imputation_id} l={l} couleur={couleur} onRelancer={onRelancer} onOuvrir={onOuvrir} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}

export default function TableauBord() {
  const router = useRouter();
  const { loading, has } = useAuth();
  const autorise = has('courrier.voir_tableau_bord');

  const [data, setData] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [relance, setRelance] = useState(null); // ligne en cours de relance

  const charger = useCallback(async () => {
    setChargement(true); setErreur('');
    try { setData(await apiGet('/api/v1/tableau-bord/')); }
    catch (e) { setErreur(e.status >= 500 ? 'Erreur serveur.' : 'Impossible de charger le tableau de bord.'); }
    finally { setChargement(false); }
  }, []);

  useEffect(() => { if (autorise) charger(); }, [autorise, charger]);

  if (loading) return <IntranetShell><Box sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Box></IntranetShell>;
  if (!autorise) return <IntranetShell><AccesRefuse message="Le tableau de bord requiert une autorisation." /></IntranetShell>;
  if (!data) return <IntranetShell><Box sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Box></IntranetShell>;

  const s = data.synthese;
  const maxActives = Math.max(1, ...data.par_direction.map((d) => d.actives));
  const t = data.temps_moyens_30j;
  const ouvrir = (id) => router.push(`/courrier/${id}`);

  return (
    <IntranetShell>
      {/* En-tête */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.3 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, backgroundColor: `${COLORS.blue}14`, color: COLORS.blue,
              display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 24 } }}>
              <DashboardIcon />
            </Box>
            <Typography component="h1" sx={{ fontWeight: 800, color: COLORS.blue, fontSize: { xs: '1.4rem', md: '1.7rem' } }}>
              Tableau de bord{!data.central && data.perimetre ? ` — ${data.perimetre}` : ''}
            </Typography>
          </Box>
          <Box sx={{ width: 64, height: 4, borderRadius: 2, background: TRICOLOR, mt: 1.2, ml: 0.2 }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ color: COLORS.muted, fontSize: '0.8rem' }}>
            Situation au {fmtHeure(data.genere_le)}
          </Typography>
          <Tooltip title="Rafraîchir">
            <IconButton onClick={charger} disabled={chargement} sx={{ border: `1px solid ${COLORS.border}`, color: COLORS.blue }}>
              {chargement ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {erreur && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{erreur}</Alert>}

      {/* Synthèse — 5 cartes */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 3 }}>
        <StatCard icon={MoveToInboxIcon} accent={COLORS.blue} label="Courriers en instance" valeur={s.courriers_en_instance} />
        <StatCard icon={MarkEmailReadIcon} accent={COLORS.blue} label="En attente d'accusé" valeur={s.imputations_en_attente_accuse} />
        <StatCard icon={WarningAmberIcon} accent={RED} label="En retard" valeur={s.en_retard} alerte />
        <StatCard icon={ScheduleIcon} accent={COLORS.orange} label="Délais sous 3 jours" valeur={s.delais_sous_3j} alerte />
        <StatCard icon={CheckCircleIcon} accent={COLORS.green} label="Traités ce mois" valeur={s.traites_30j} />
      </Box>

      {/* Par direction */}
      <SectionTitre>Par direction</SectionTitre>
      <TableContainer component={Paper} elevation={0}
        sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: 'hidden', boxShadow: '0 8px 22px rgba(0,40,80,0.06)' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 800, color: COLORS.blueDark, backgroundColor: '#f2f6fb', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.3 } }}>
              <TableCell>Direction</TableCell><TableCell align="center">Actives</TableCell>
              <TableCell align="center">En retard</TableCell><TableCell align="center">Âge moyen</TableCell>
              <TableCell align="center">Plus ancien</TableCell><TableCell sx={{ width: '25%' }}>Charge</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.par_direction.map((d) => (
              <TableRow key={d.direction.id} hover sx={{ '&:hover td': { backgroundColor: '#f7fafd' } }}>
                <TableCell sx={{ fontWeight: 800, color: COLORS.blue }}>{d.direction.sigle}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>{d.actives}</TableCell>
                <TableCell align="center">
                  {d.en_retard > 0
                    ? <Chip size="small" label={d.en_retard} sx={{ fontWeight: 800, backgroundColor: `${RED}1f`, color: RED }} />
                    : <Typography sx={{ color: COLORS.muted }}>0</Typography>}
                </TableCell>
                <TableCell align="center" sx={{ color: COLORS.ink }}>{d.age_moyen_jours} j</TableCell>
                <TableCell align="center" sx={{ color: COLORS.ink }}>{d.plus_ancien_jours} j</TableCell>
                <TableCell>
                  <LinearProgress variant="determinate" value={(d.actives / maxActives) * 100}
                    sx={{ height: 8, borderRadius: 5, backgroundColor: COLORS.bg,
                      '& .MuiLinearProgress-bar': { borderRadius: 5, backgroundColor: d.en_retard > 0 ? RED : COLORS.blue } }} />
                </TableCell>
              </TableRow>
            ))}
            {data.par_direction.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: COLORS.muted }}>Aucune imputation active.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Retards */}
      <ListePilotage titre="Retards" couleur={RED} lignes={data.retards}
        vide="Aucun retard. 👍" onRelancer={setRelance} onOuvrir={ouvrir} />

      {/* Délais proches */}
      <ListePilotage titre="Délais proches" couleur={COLORS.orange} lignes={data.delais_proches}
        vide="Aucune échéance dans les 3 jours." onRelancer={setRelance} onOuvrir={ouvrir} />

      {/* Temps moyens */}
      <Box sx={{ mt: 4, mb: 1, display: 'flex', flexWrap: 'wrap', gap: 3, color: COLORS.muted, fontSize: '0.82rem' }}>
        <span><b style={{ color: COLORS.ink }}>Temps moyens (30 j) —</b></span>
        <span>Enregistrement → imputation : <b style={{ color: COLORS.ink }}>{t.enregistrement_vers_imputation_h ?? '—'} h</b></span>
        <span>Imputation → accusé : <b style={{ color: COLORS.ink }}>{t.imputation_vers_accuse_h ?? '—'} h</b></span>
        <span>Accusé → traité : <b style={{ color: COLORS.ink }}>{t.accuse_vers_traite_jours ?? '—'} j</b></span>
      </Box>

      <DialogRelance ligne={relance} onClose={() => setRelance(null)} onDone={() => { setRelance(null); charger(); }} />
    </IntranetShell>
  );
}

function DialogRelance({ ligne, onClose, onDone }) {
  const [commentaire, setCommentaire] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => { setCommentaire(''); setErreur(''); setEnvoi(false); }, [ligne]);
  if (!ligne) return null;

  async function valider() {
    setEnvoi(true); setErreur('');
    try {
      await apiPost(`/api/v1/imputations/${ligne.imputation_id}/relancer/`, { commentaire });
      onDone();
    } catch (e) {
      setErreur(e instanceof ApiError && e.data?.detail ? e.data.detail : 'Échec de la relance.');
      setEnvoi(false);
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLORS.blue }}>
        Relancer — {ligne.courrier.numero} ({ligne.direction_cible})
      </DialogTitle>
      <DialogContent dividers>
        {erreur && <Alert severity="error" sx={{ mb: 2 }}>{erreur}</Alert>}
        <Typography sx={{ color: COLORS.muted, fontSize: '0.88rem', mb: 2 }}>
          Une relance sera tracée et mise en évidence dans la bannette du destinataire. Aucun email n'est envoyé.
        </Typography>
        <TextField label="Commentaire (optionnel)" value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
          fullWidth multiline minRows={2} slotProps={{ htmlInput: { maxLength: 500 } }} autoFocus />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={valider} disabled={envoi} startIcon={<NotificationsActiveIcon />}
          sx={{ backgroundColor: COLORS.blue, fontWeight: 700, '&:hover': { backgroundColor: COLORS.blueHover } }}>
          {envoi ? 'Relance…' : 'Confirmer la relance'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
