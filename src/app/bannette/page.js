'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Paper, Grid, Button, Chip, Tabs, Tab, List, ListItemButton,
  Autocomplete, TextField, RadioGroup, Radio, FormControlLabel, FormControl, FormLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Alert, IconButton, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import IntranetShell from '@/components/IntranetShell';
import AccesRefuse from '@/components/AccesRefuse';
import { apiGet, apiPost, apiBase, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { badgeDelai } from '@/lib/delais';
import { COLORS, TRICOLOR } from '@/theme';

// En-tête de page (icône + titre + filet tricolore).
function Entete({ titre, sousTitre }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.3 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, backgroundColor: `${COLORS.gold}1f`, color: COLORS.goldDark,
          display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 24 } }}>
          <MoveToInboxIcon />
        </Box>
        <Box>
          <Typography component="h1" sx={{ fontWeight: 800, color: COLORS.blue, fontSize: { xs: '1.4rem', md: '1.7rem' }, lineHeight: 1.1 }}>
            {titre}
          </Typography>
          {sousTitre && <Typography sx={{ color: COLORS.muted, fontSize: '0.85rem' }}>{sousTitre}</Typography>}
        </Box>
      </Box>
      <Box sx={{ width: 64, height: 4, borderRadius: 2, background: TRICOLOR, mt: 1.2, ml: 0.2 }} />
    </Box>
  );
}

// En-tête coloré d'un panneau (carte).
function TetePanneau({ children }) {
  return (
    <Box sx={{ px: 2, py: 1.5, color: '#fff', fontWeight: 800, fontSize: '0.95rem',
      background: 'linear-gradient(100deg, #002B55 0%, #004080 100%)' }}>
      {children}
    </Box>
  );
}

// Styles réutilisables pour les cartes de panneau.
const PANNEAU = { border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: 'hidden', boxShadow: '0 8px 22px rgba(0,40,80,0.06)' };

const INSTRUCTIONS = [
  ['POUR_TRAITEMENT', 'Pour traitement'],
  ['POUR_AVIS', 'Pour avis'],
  ['POUR_INFORMATION', 'Pour information'],
  ['POUR_ATTRIBUTION', 'Pour attribution'],
  ['M_EN_PARLER', "M'en parler"],
];

function ChipDelai({ delai }) {
  const b = badgeDelai(delai);
  if (!b) return null;
  return <Chip size="small" label={b.libelle} color={b.couleur === 'default' ? undefined : b.couleur}
    variant={b.couleur === 'default' ? 'outlined' : 'filled'} sx={{ fontWeight: 700 }} />;
}

function ResumeCourrier({ c }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontWeight: 700, color: COLORS.blue, fontSize: '0.9rem' }}>
        {c.numero_ordre} · {c.correspondant}
      </Typography>
      <Typography sx={{ color: COLORS.ink, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {c.objet}
      </Typography>
      <Typography sx={{ color: COLORS.muted, fontSize: '0.72rem' }}>
        Arrivé il y a {c.anciennete_jours} j
      </Typography>
    </Box>
  );
}

// ---- Écran d'imputation central (PDF à gauche, formulaire à droite) ----
function EcranImputation({ courrier, directions, onValide, onAnnule }) {
  const [direction, setDirection] = useState(null);
  const [instruction, setInstruction] = useState('POUR_TRAITEMENT');
  const [delai, setDelai] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [copies, setCopies] = useState([]); // directions pour information
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function valider() {
    setErreur('');
    if (!direction) { setErreur('Sélectionnez une direction.'); return; }
    setEnvoi(true);
    try {
      await apiPost(`/api/v1/courriers/${courrier.id}/imputations/`, {
        direction_cible: direction.id, instruction, delai: delai || null, commentaire,
      });
      for (const c of copies) {
        if (c) await apiPost(`/api/v1/courriers/${courrier.id}/imputations/`, {
          direction_cible: c.id, instruction: 'POUR_INFORMATION',
        });
      }
      onValide();
    } catch (err) {
      setErreur(err instanceof ApiError && err.data?.detail ? err.data.detail : "Échec de l'imputation.");
      setEnvoi(false);
    }
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Paper elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 2, overflow: 'hidden', height: { xs: 360, md: '70vh' } }}>
          <Box component="iframe" title="Scan" src={`${apiBase()}/api/v1/courriers/${courrier.id}/scan/`}
            sx={{ width: '100%', height: '100%', border: 0 }} />
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${COLORS.border}`, borderRadius: 2 }}>
          <Typography sx={{ fontWeight: 800, color: COLORS.blue, mb: 0.5 }}>{courrier.numero_ordre}</Typography>
          <Typography sx={{ color: COLORS.muted, fontSize: '0.85rem', mb: 2 }}>{courrier.correspondant} — {courrier.objet}</Typography>
          {erreur && <Alert severity="error" sx={{ mb: 2 }}>{erreur}</Alert>}

          <Autocomplete options={directions} value={direction} onChange={(e, v) => setDirection(v)}
            getOptionLabel={(o) => `${o.sigle} — ${o.nom}`} isOptionEqualToValue={(o, v) => o.id === v.id}
            renderInput={(p) => <TextField {...p} label="Direction destinataire" required />} sx={{ mb: 2 }} />

          <FormControl sx={{ mb: 2 }}>
            <FormLabel sx={{ fontSize: '0.8rem', fontWeight: 700 }}>Instruction</FormLabel>
            <RadioGroup value={instruction} onChange={(e) => setInstruction(e.target.value)}>
              {INSTRUCTIONS.map(([v, l]) => (
                <FormControlLabel key={v} value={v} control={<Radio size="small" />} label={l}
                  slotProps={{ typography: { fontSize: '0.88rem' } }} />
              ))}
            </RadioGroup>
          </FormControl>

          <TextField label="Délai (optionnel)" type="date" value={delai} onChange={(e) => setDelai(e.target.value)}
            fullWidth slotProps={{ inputLabel: { shrink: true } }} sx={{ mb: 2 }} />
          <TextField label="Commentaire" value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
            fullWidth multiline minRows={2} sx={{ mb: 2 }} slotProps={{ htmlInput: { maxLength: 500 } }} />

          {copies.map((c, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
              <Autocomplete size="small" fullWidth options={directions} value={c}
                onChange={(e, v) => setCopies((old) => old.map((x, j) => j === i ? v : x))}
                getOptionLabel={(o) => `${o.sigle} — ${o.nom}`} isOptionEqualToValue={(o, v) => o.id === v.id}
                renderInput={(p) => <TextField {...p} label="Copie pour information" />} />
              <IconButton onClick={() => setCopies((old) => old.filter((_, j) => j !== i))}><DeleteIcon /></IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={() => setCopies((old) => [...old, null])} sx={{ mb: 2 }}>
            Ajouter une copie pour information
          </Button>

          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
            <Button onClick={onAnnule}>Passer</Button>
            <Button variant="contained" onClick={valider} disabled={envoi}
              sx={{ backgroundColor: COLORS.blue, fontWeight: 700, '&:hover': { backgroundColor: COLORS.blueHover } }}>
              {envoi ? 'Imputation…' : 'Imputer'}
            </Button>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}

export default function Bannette() {
  const router = useRouter();
  const { loading, has } = useAuth();
  const central = has('courrier.imputer_premier_niveau');
  const secretariat = has('courrier.accuser_reception');

  const [bann, setBann] = useState(null);
  const [directions, setDirections] = useState([]);
  const [selection, setSelection] = useState(null); // courrier en cours d'imputation (central)
  const [onglet, setOnglet] = useState(0);
  const [dialogTraite, setDialogTraite] = useState(null); // imputation à traiter
  const [dialogSous, setDialogSous] = useState(null); // imputation à sous-imputer
  const [busy, setBusy] = useState(false);

  const charger = useCallback(async () => {
    try {
      const b = await apiGet('/api/v1/bannette/');
      setBann(b);
    } catch { setBann({}); }
  }, []);

  useEffect(() => { if (central || secretariat) charger(); }, [central, secretariat, charger]);
  useEffect(() => { if (central || secretariat) apiGet('/api/v1/directions/').then(setDirections).catch(() => {}); }, [central, secretariat]);

  if (loading) return <IntranetShell><Box sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Box></IntranetShell>;
  if (!central && !secretariat) return <IntranetShell><AccesRefuse message="Vous n'avez pas de bannette." /></IntranetShell>;
  if (!bann) return <IntranetShell><Box sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Box></IntranetShell>;

  async function accuser(id) {
    setBusy(true);
    try { await apiPost(`/api/v1/imputations/${id}/accuser/`); await charger(); } catch { /* ignore */ } finally { setBusy(false); }
  }

  // ---------- Vue CENTRAL ----------
  if (central) {
    if (selection) {
      const suivant = () => {
        const reste = (bann.a_imputer || []).filter((c) => c.id !== selection.id);
        setSelection(reste[0] || null);
        charger();
      };
      return (
        <IntranetShell>
          <Entete titre="Imputer un courrier" sousTitre="Affectez le courrier à une direction destinataire" />
          <EcranImputation courrier={selection} directions={directions}
            onValide={suivant} onAnnule={() => setSelection(null)} />
        </IntranetShell>
      );
    }
    return (
      <IntranetShell>
        <Entete titre="Ma bannette" sousTitre="Imputation du courrier arrivée" />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper elevation={0} sx={PANNEAU}>
              <TetePanneau>À imputer ({bann.a_imputer?.length || 0})</TetePanneau>
              <List disablePadding>
                {(bann.a_imputer || []).map((c) => (
                  <ListItemButton key={c.id} onClick={() => setSelection(c)} divider>
                    <ResumeCourrier c={c} />
                  </ListItemButton>
                ))}
                {(bann.a_imputer || []).length === 0 && (
                  <Box sx={{ p: 3, textAlign: 'center', color: COLORS.muted }}>Rien à imputer.</Box>
                )}
              </List>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={0} sx={PANNEAU}>
              <TetePanneau>Suivi — en attente d'accusé ({bann.suivi?.length || 0})</TetePanneau>
              <List disablePadding>
                {(bann.suivi || []).map((i) => (
                  <Box key={i.imputation_id} onClick={() => router.push(`/courrier/${i.courrier.id}`)}
                    sx={{ p: 1.5, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', gap: 1,
                      cursor: 'pointer', '&:hover': { backgroundColor: `${COLORS.blue}08` } }}>
                    <ResumeCourrier c={i.courrier} />
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Chip size="small" label={i.direction_cible} sx={{ mb: 0.5 }} />
                      <ChipDelai delai={i.delai} />
                    </Box>
                  </Box>
                ))}
                {(bann.suivi || []).length === 0 && <Box sx={{ p: 3, textAlign: 'center', color: COLORS.muted }}>—</Box>}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </IntranetShell>
    );
  }

  // ---------- Vue SECRÉTARIAT ----------
  const listes = [bann.a_accuser || [], bann.en_cours || [], bann.traites || []];
  const titres = [`À accuser (${listes[0].length})`, `En cours (${listes[1].length})`, `Traités (${listes[2].length})`];
  const courante = listes[onglet];

  return (
    <IntranetShell>
      <Entete titre="Ma bannette" sousTitre="Traitement du courrier qui vous est imputé" />
      <Tabs value={onglet} onChange={(e, v) => setOnglet(v)}
        sx={{ mb: 2, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none' },
          '& .MuiTabs-indicator': { height: 3, borderRadius: 3 } }}>
        {titres.map((t) => <Tab key={t} label={t} />)}
      </Tabs>

      <Paper elevation={0} sx={PANNEAU}>
        <List disablePadding>
          {courante.map((i) => (
            <Box key={i.imputation_id} sx={{ p: 1.5, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Box role="link" onClick={() => router.push(`/courrier/${i.courrier.id}`)}
                sx={{ flex: 1, minWidth: 220, cursor: 'pointer', borderRadius: 1, p: 0.5, m: -0.5,
                  '&:hover': { backgroundColor: `${COLORS.blue}08` } }}>
                <ResumeCourrier c={i.courrier} />
              </Box>
              <Chip size="small" label={i.instruction_libelle} sx={{ backgroundColor: `${COLORS.blue}14`, color: COLORS.blue }} />
              <ChipDelai delai={i.delai} />
              {onglet === 0 && (
                <Button size="small" variant="contained" startIcon={<CheckIcon />} disabled={busy}
                  onClick={(e) => { e.stopPropagation(); accuser(i.imputation_id); }}
                  sx={{ backgroundColor: COLORS.green, '&:hover': { backgroundColor: COLORS.greenDark } }}>
                  Accuser réception
                </Button>
              )}
              {onglet === 1 && (
                <>
                  <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); setDialogSous(i); }}>Sous-imputer</Button>
                  <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); setDialogTraite(i); }}
                    sx={{ backgroundColor: COLORS.blue, '&:hover': { backgroundColor: COLORS.blueHover } }}>Marquer traité</Button>
                </>
              )}
            </Box>
          ))}
          {courante.length === 0 && <Box sx={{ p: 3, textAlign: 'center', color: COLORS.muted }}>Aucun élément.</Box>}
        </List>
      </Paper>

      <DialogTraite imp={dialogTraite} onClose={() => setDialogTraite(null)} onDone={() => { setDialogTraite(null); charger(); }} />
      <DialogSous imp={dialogSous} directions={directions} onClose={() => setDialogSous(null)}
        onDone={() => { setDialogSous(null); charger(); }} />
    </IntranetShell>
  );
}

function DialogTraite({ imp, onClose, onDone }) {
  const [commentaire, setCommentaire] = useState('');
  const [erreur, setErreur] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setCommentaire(''); setErreur(''); }, [imp]);
  if (!imp) return null;
  async function valider() {
    if (!commentaire.trim()) { setErreur('Le commentaire est obligatoire.'); return; }
    setBusy(true);
    try { await apiPost(`/api/v1/imputations/${imp.imputation_id}/traiter/`, { commentaire }); onDone(); }
    catch (e) { setErreur(e instanceof ApiError && e.data?.detail ? e.data.detail : 'Échec.'); setBusy(false); }
  }
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLORS.blue }}>Marquer traité — {imp.courrier.numero_ordre}</DialogTitle>
      <DialogContent dividers>
        {erreur && <Alert severity="error" sx={{ mb: 2 }}>{erreur}</Alert>}
        <TextField label="Commentaire (ex. « réponse transmise le… »)" value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)} fullWidth multiline minRows={2} autoFocus />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={valider} disabled={busy}
          sx={{ backgroundColor: COLORS.blue, fontWeight: 700 }}>Valider</Button>
      </DialogActions>
    </Dialog>
  );
}

function DialogSous({ imp, directions, onClose, onDone }) {
  const [direction, setDirection] = useState(null);
  const [instruction, setInstruction] = useState('POUR_TRAITEMENT');
  const [erreur, setErreur] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDirection(null); setInstruction('POUR_TRAITEMENT'); setErreur(''); }, [imp]);
  if (!imp) return null;
  async function valider() {
    if (!direction) { setErreur('Sélectionnez une direction.'); return; }
    setBusy(true);
    try {
      await apiPost(`/api/v1/courriers/${imp.courrier.id}/imputations/`, {
        direction_cible: direction.id, instruction, imputation_mere: imp.imputation_id,
      });
      onDone();
    } catch (e) { setErreur(e instanceof ApiError && e.data?.detail ? e.data.detail : 'Échec.'); setBusy(false); }
  }
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLORS.blue }}>Sous-imputer — {imp.courrier.numero_ordre}</DialogTitle>
      <DialogContent dividers>
        {erreur && <Alert severity="error" sx={{ mb: 2 }}>{erreur}</Alert>}
        <Autocomplete options={directions} value={direction} onChange={(e, v) => setDirection(v)}
          getOptionLabel={(o) => `${o.sigle} — ${o.nom}`} isOptionEqualToValue={(o, v) => o.id === v.id}
          renderInput={(p) => <TextField {...p} label="Direction (dans votre sous-arbre)" required />} sx={{ my: 1 }} />
        <FormControl>
          <FormLabel sx={{ fontSize: '0.8rem', fontWeight: 700 }}>Instruction</FormLabel>
          <RadioGroup row value={instruction} onChange={(e) => setInstruction(e.target.value)}>
            {INSTRUCTIONS.map(([v, l]) => <FormControlLabel key={v} value={v} control={<Radio size="small" />} label={l} slotProps={{ typography: { fontSize: '0.85rem' } }} />)}
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={valider} disabled={busy}
          sx={{ backgroundColor: COLORS.blue, fontWeight: 700 }}>Sous-imputer</Button>
      </DialogActions>
    </Dialog>
  );
}
